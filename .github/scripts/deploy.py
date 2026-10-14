"""Manual, image-only deployment of CareerFlow; Azure login is owned by the workflow."""

import base64
import hashlib
import json
import os
import re
import subprocess
import time
from urllib.error import URLError
from urllib.parse import urlsplit
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


def az(*args):
    # Never echo raw CLI output: app responses and errors can contain runtime credentials.
    timeout = 300 if args[:2] == ('acr', 'build') else 60
    try:
        result = subprocess.run(
            ['az', *args, '--only-show-errors'], capture_output=True, text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(f'Azure {" ".join(args[:2])} exceeded its {timeout}s command timeout.') from None
    if result.returncode:
        raise RuntimeError(
            f'Azure {" ".join(args[:2])} failed (exit {result.returncode}). '
            'Inspect the named ACR run or Container App operation in Azure; raw output is suppressed.'
        )
    return json.loads(result.stdout) if result.stdout.strip() else {}


def summary(message):
    print(message)
    if path := os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(path, 'a', encoding='utf-8') as stream:
            stream.write(message + '\n\n')


def build_config():
    url = os.environ.get('REACT_APP_SUPABASE_URL', '').strip()
    key = os.environ.get('REACT_APP_SUPABASE_PUBLISHABLE_KEY', '').strip()
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise RuntimeError('Set the public HTTPS REACT_APP_SUPABASE_URL repository secret.')
    public_key = bool(re.fullmatch(r'sb_publishable_[A-Za-z0-9_-]+', key))
    if not public_key:
        try:
            payload = key.split('.')[1]
            public_key = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))['role'] == 'anon'
        except (IndexError, KeyError, ValueError, TypeError):
            pass
    if not public_key:
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


def image_from_run(run, prefix):
    if run.get('status') != 'Succeeded':
        return None
    for image in run.get('outputImages') or []:
        if (image.get('registry') == SERVER and image.get('repository') == APP
                and image.get('tag', '').startswith(prefix)
                and re.fullmatch(r'sha256:[0-9a-f]{64}', image.get('digest', ''))):
            return image
    return None


def build_image(sha, config):
    fingerprint = hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()[:12]
    prefix = f'sha-{sha}-{fingerprint}-'
    # Task history can expire; unique run-ID tags also prevent retagging when a rebuild is necessary.
    runs = az(
        'acr', 'task', 'list-runs', '--registry', REGISTRY, '--resource-group', GROUP,
        '--run-status', 'Succeeded', '--top', '100', '--output', 'json',
    )
    for run in runs:
        if image := image_from_run(run, prefix):
            summary('Reusing a retained successful ACR build for this SHA and public build configuration.')
            return image
    arguments = [argument for name, value in config.items() for argument in ('--build-arg', f'{name}={value}')]
    queued = az(
        'acr', 'build', '--registry', REGISTRY, '--resource-group', GROUP,
        '--image', f'{APP}:{prefix}{{{{.Run.ID}}}}', '--file', 'Dockerfile', '--platform', 'linux/amd64',
        '--timeout', '1800', '--no-wait', '--no-logs', *arguments, '.', '--output', 'json',
    )
    run_id = queued['runId']
    summary(f'ACR build run: `{run_id}`. Diagnose with `az acr task logs --registry {REGISTRY} --run-id {run_id}`.')
    deadline = time.monotonic() + 1800
    while time.monotonic() < deadline:
        run = az(
            'acr', 'task', 'show-run', '--registry', REGISTRY, '--resource-group', GROUP,
            '--run-id', run_id, '--output', 'json',
        )
        if image := image_from_run(run, prefix):
            return image
        if run.get('status') in {'Failed', 'Error', 'Canceled', 'Timeout', 'Succeeded'}:
            raise RuntimeError(f'ACR build {run_id} failed or returned no matching image ({run.get("status")}).')
        time.sleep(15)
    raise RuntimeError(f'ACR build {run_id} timed out; inspect/cancel that run manually. Production was not updated.')


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


def main():
    if (os.environ.get('GITHUB_EVENT_NAME') != 'workflow_dispatch'
            or os.environ.get('GITHUB_REF') != 'refs/heads/main'
            or os.environ.get('GITHUB_REPOSITORY') != 'danialyermekov/careerflow'):
        raise RuntimeError('Production deployment is only allowed by manual dispatch from this repository main branch.')
    sha = os.environ.get('GITHUB_SHA', '')
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise RuntimeError('A full Git commit SHA is required.')
    config = build_config()
    previous = preflight()
    summary(f'Checked/deployed Git commit: `{sha}`.')
    built = build_image(sha, config)
    image = f'{SERVER}/{APP}@{built["digest"]}'
    summary(f'Image tag: `{SERVER}/{APP}:{built["tag"]}`; immutable deployment image: `{image}`.')
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
        main()
    except (RuntimeError, KeyError, ValueError) as error:
        summary(f'::error::{error}')
        raise SystemExit(1) from None
