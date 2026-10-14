"""Manual, image-only deployment of CareerFlow; Azure login is owned by the workflow."""

import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.parse import quote, quote_plus, urlsplit
from urllib.request import Request, urlopen


APP = 'careerflow'
GROUP = 'careerflow-rg'
REGISTRY = 'careerflowacr'
SERVER = 'careerflowacr.azurecr.io'
APP_QUERY = (
    '{id:id,mode:properties.configuration.activeRevisionsMode,'
    'latest:properties.latestRevisionName,ready:properties.latestReadyRevisionName,'
    'containers:properties.template.containers[].{name:name,image:image},'
    'scale:properties.template.scale,ingress:properties.configuration.ingress}'
)
REVISION_QUERY = (
    '{name:name,active:properties.active,provisioning:properties.provisioningState,'
    'health:properties.healthState,running:properties.runningState,traffic:properties.trafficWeight,'
    'image:properties.template.containers[0].image}'
)


SENSITIVE_NAME = (
    r'(?:[\w-]*(?:secret|token|password|passwd|credential|key)[\w-]*'
    r'|[\w-]*username[\w-]*|authorization|sig|connection[_-]?string)'
)
DIAGNOSTIC_VALUE = r'''(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,;&"'<>]+)'''


def redact_diagnostics(output, args):
    """Keep CLI failure reasons while removing credentials and command echoes."""
    if isinstance(output, bytes):
        output = output.decode('utf-8', errors='replace')
    output = output or ''
    values = [value for name, value in os.environ.items()
              if re.fullmatch(SENSITIVE_NAME, name, re.IGNORECASE) or name.startswith('REACT_APP_')]
    for index, argument in enumerate(args):
        option, separator, value = argument.partition('=')
        if option in {'--build-arg', '--secret-build-arg'} or re.fullmatch(
                '--' + SENSITIVE_NAME, option, re.IGNORECASE):
            value = value if separator else args[index + 1] if index + 1 < len(args) else ''
            values.append(value)
            if option in {'--build-arg', '--secret-build-arg'} and '=' in value:
                values.append(value.split('=', 1)[1])
    # Remove echoed commands entirely, including their non-sensitive arguments.
    output = re.sub(r'(?im)^.*\b(?:az|docker)(?:\.cmd|\.exe)?\s+[^\r\n]*', '<REDACTED>', output)
    for value in sorted({variant for value in values if value for variant in (
            value, quote(value, safe=''), quote_plus(value), json.dumps(value)[1:-1],
    )}, key=len, reverse=True):
        output = output.replace(value, '<REDACTED>')
    output = re.sub(r'-----BEGIN [^-]*PRIVATE KEY-----.*?-----END [^-]*PRIVATE KEY-----',
                    '<REDACTED>', output, flags=re.DOTALL)
    output = re.sub(r'(?i)\b(?:Bearer|Basic)\s+[^\s,;\"\']+', '<REDACTED>', output)
    output = re.sub(r'(?i)([a-z][a-z0-9+.-]*://)[^/\s]+@', r'\1<REDACTED>@', output)
    # Handles JSON, headers, connection strings, query parameters and CLI options.
    output = re.sub(
        r'(?i)([\"\']?(?:--)?' + SENSITIVE_NAME + r'[\"\']?\s*(?:=|:|\s)\s*)' + DIAGNOSTIC_VALUE,
        r'\1<REDACTED>', output,
    )
    output = re.sub(r'''(?i)--(?:secret-)?build-arg(?:=|\s+)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s]+)''',
                    '--build-arg <REDACTED>', output)
    output = re.sub(r'\b(?:eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'
                    r'|sb_(?:secret|publishable)_[A-Za-z0-9_-]+'
                    r'|gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b', '<REDACTED>', output)
    # Flatten control characters so CLI text cannot inject GitHub workflow commands.
    output = ' '.join(re.sub(r'[\x00-\x1f\x7f-\x9f]', ' ', output).split())
    return output[:6000] or 'No Azure CLI error output was captured.'


def command(program, args, timeout=60):
    label = 'Azure' if program == 'az' else 'Docker'
    try:
        result = subprocess.run(
            [program, *args], capture_output=True, text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired as error:
        details = ' '.join(redact_diagnostics(part, args) for part in (error.stderr, error.stdout) if part)
        raise RuntimeError(
            f'{label} {" ".join(args[:2])} exceeded its {timeout}s command timeout. '
            + (details or 'No Azure CLI error output was captured.')
        ) from None
    if result.returncode:
        details = redact_diagnostics('\n'.join(part for part in (result.stderr, result.stdout) if part), args)
        raise RuntimeError(
            f'{label} {" ".join(args[:2])} failed (exit {result.returncode}). {details}'
        )
    return result.stdout


def az(*args):
    output = command('az', (*args, '--only-show-errors'))
    return json.loads(output) if output.strip() else {}


def summary(message):
    print(message)
    if path := os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(path, 'a', encoding='utf-8') as stream:
            stream.write(message + '\n\n')


def build_config():
    url = os.environ.get('REACT_APP_SUPABASE_URL', '').strip()
    key = os.environ.get('REACT_APP_SUPABASE_PUBLISHABLE_KEY', '').strip()
    parsed = urlsplit(url)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or any(character.isspace() for character in url)):
        raise RuntimeError('Set the public HTTPS REACT_APP_SUPABASE_URL repository secret.')
    public_key = bool(re.fullmatch(r'sb_publishable_[A-Za-z0-9_-]+', key))
    if not public_key:
        try:
            payload = key.split('.')[1]
            public_key = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))['role'] == 'anon'
        except (IndexError, KeyError, ValueError, TypeError):
            pass
    if not public_key or any(character.isspace() for character in key):
        raise RuntimeError('Set REACT_APP_SUPABASE_PUBLISHABLE_KEY to a publishable or legacy anon key, never a server key.')
    return {'REACT_APP_API_URL': '', 'REACT_APP_SUPABASE_URL': url, 'REACT_APP_SUPABASE_PUBLISHABLE_KEY': key}


def app_state():
    return az('containerapp', 'show', '--name', APP, '--resource-group', GROUP, '--query', APP_QUERY, '--output', 'json')


def preflight():
    registry = az(
        'acr', 'show', '--name', REGISTRY, '--resource-group', GROUP,
        '--query', '{loginServer:loginServer,roleAssignmentMode:roleAssignmentMode}', '--output', 'json',
    )
    if registry.get('loginServer') != SERVER:
        raise RuntimeError('The configured subscription does not contain the expected ACR login server.')
    if registry.get('roleAssignmentMode') != 'LegacyRegistryPermissions':
        raise RuntimeError('ACR ABAC requires an explicitly reviewed repository-writer identity; no permissions are changed.')
    app = app_state()
    suffix = f'/resourceGroups/{GROUP}/providers/Microsoft.App/containerApps/{APP}'
    if not app.get('id', '').lower().endswith(suffix.lower()):
        raise RuntimeError('Unexpected Container App resource group or resource identity.')
    containers = app.get('containers', [])
    ingress, scale = app.get('ingress') or {}, app.get('scale') or {}
    domains = [domain['name'] for domain in ingress.get('customDomains') or []]
    if (app.get('mode') != 'Single' or len(containers) != 1 or containers[0]['name'] != APP
            or scale.get('maxReplicas') != 1 or scale.get('minReplicas') not in (0, 1)
            or ingress.get('targetPort') != 8000 or not ingress.get('external') or 'careerflow.live' not in domains):
        raise RuntimeError('Unexpected production topology. Review revision mode, container, ingress and scaling before deploying.')
    if not app.get('ready') or app['latest'] != app['ready']:
        raise RuntimeError('The latest revision is not the ready revision; resolve the previous update before deploying.')
    previous = az(
        'containerapp', 'revision', 'show', '--name', APP, '--resource-group', GROUP,
        '--revision', app['ready'], '--query', REVISION_QUERY, '--output', 'json',
    )
    if not previous.get('active') or previous.get('traffic') != 100 or not previous.get('image'):
        raise RuntimeError('Cannot establish the currently serving revision and its rollback image.')
    summary(f'Previous revision: `{previous["name"]}`; rollback image: `{previous["image"]}`.')
    return app


def image_tag(sha, config):
    fingerprint = hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()[:12]
    run_id, attempt = os.environ.get('GITHUB_RUN_ID', ''), os.environ.get('GITHUB_RUN_ATTEMPT', '')
    if not all(re.fullmatch(r'[0-9]+', value) for value in (run_id, attempt)):
        raise RuntimeError('GitHub run ID and attempt are required for a unique image tag.')
    return f'sha-{sha}-{fingerprint}-{run_id}-{attempt}'


def push_image(tag):
    # OIDC supplies a short-lived Docker credential; never enable the registry admin account.
    az('acr', 'login', '--name', REGISTRY, '--output', 'none')
    output = command('docker', ('push', f'{SERVER}/{APP}:{tag}'), timeout=1800)
    matches = re.findall(r'\bdigest: (sha256:[0-9a-f]{64})\b', output)
    if len(matches) != 1:
        raise RuntimeError('Docker push did not return exactly one valid image digest; production was not updated.')
    digest = az('acr', 'repository', 'show', '--name', REGISTRY, '--image', f'{APP}:{tag}',
                '--query', 'digest', '--output', 'json')
    if digest != matches[0]:
        raise RuntimeError('Registry digest does not match the pushed image; production was not updated.')
    return digest


def ready_revision(image):
    app = app_state()
    if app.get('mode') != 'Single':
        raise RuntimeError('Revision mode changed during deployment; refusing to infer production traffic.')
    if not app.get('latest') or app.get('ready') != app['latest']:
        return None
    revision = az(
        'containerapp', 'revision', 'show', '--name', APP, '--resource-group', GROUP,
        '--revision', app['latest'], '--query', REVISION_QUERY, '--output', 'json',
    )
    if revision.get('image') != image:
        return None
    if revision.get('provisioning') == 'Failed' or revision.get('running') in {'Failed', 'Degraded'}:
        raise RuntimeError(f'Revision {revision["name"]} failed startup; inspect Azure revision diagnostics.')
    if (revision.get('active') and revision.get('provisioning') == 'Provisioned'
            and revision.get('health') == 'Healthy' and revision.get('traffic') == 100
            and revision.get('running') in {'Running', 'RunningAtMaxScale', 'ScaledToZero'}):
        return revision['name']
    return None


def health_ok():
    request = Request(
        'https://careerflow.live/health?deployment=' + os.environ['GITHUB_SHA'],
        headers={'Cache-Control': 'no-cache, no-store', 'Accept': 'application/json'},
    )
    try:
        with urlopen(request, timeout=20) as response:
            return response.status == 200 and json.load(response).get('status') == 'ok'
    except (URLError, OSError, ValueError):
        return False


def deployment_config():
    if (os.environ.get('GITHUB_EVENT_NAME') != 'workflow_dispatch'
            or os.environ.get('GITHUB_REF') != 'refs/heads/main'
            or os.environ.get('GITHUB_REPOSITORY') != 'danialyermekov/careerflow'):
        raise RuntimeError('Production deployment is only allowed by manual dispatch from this repository main branch.')
    sha = os.environ.get('GITHUB_SHA', '')
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise RuntimeError('A full Git commit SHA is required.')
    config = build_config()
    return sha, config


def prepare_image():
    sha, config = deployment_config()
    tag = image_tag(sha, config)
    with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as stream:
        stream.write(f'tag={SERVER}/{APP}:{tag}\n')
    # Normalized public values must match both the fingerprint and Docker build arguments.
    with open(os.environ['GITHUB_ENV'], 'a', encoding='utf-8') as stream:
        for name, value in config.items():
            stream.write(f'{name}={value}\n')


def main():
    sha, config = deployment_config()
    tag = image_tag(sha, config)
    previous = preflight()
    summary(f'Checked/deployed Git commit: `{sha}`.')
    image = f'{SERVER}/{APP}@{push_image(tag)}'
    summary(f'Image tag: `{SERVER}/{APP}:{tag}`; immutable deployment image: `{image}`.')
    if previous['containers'][0]['image'] != image:
        az(
            'containerapp', 'update', '--name', APP, '--resource-group', GROUP,
            '--container-name', APP, '--image', image, '--no-wait', '--output', 'none',
        )
    deadline = time.monotonic() + 600
    while time.monotonic() < deadline:
        revision = ready_revision(image)
        # A 200 from the old revision is not evidence; check image/readiness/traffic on both sides of HTTP.
        if revision and health_ok() and ready_revision(image) == revision:
            summary(f'Deployment verified: revision `{revision}`, image `{image}`, 100% traffic, public `/health` OK.')
            return
        time.sleep(10)
    raise RuntimeError('Deployment verification timed out. Inspect Azure and the recorded previous image; no automatic rollback.')


if __name__ == '__main__':
    try:
        if sys.argv[1:] == ['--prepare-image']:
            prepare_image()
        elif sys.argv[1:] == ['--validate']:
            deployment_config()
        elif not sys.argv[1:]:
            main()
        else:
            raise RuntimeError('Unknown deployment command.')
    except (RuntimeError, KeyError, ValueError) as error:
        summary(f'::error::{error}')
        raise SystemExit(1) from None
