"""Exercise deployment decisions without Azure writes or production HTTP requests."""

import copy
import io
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

import deploy


SHA = 'a' * 40
DIGEST = 'sha256:' + 'b' * 64
IMAGE = 'careerflowacr.azurecr.io/careerflow@' + DIGEST
PREFIX = 'sha-' + SHA + '-4c6fba90a8a3-'
ENV = {
    'GITHUB_EVENT_NAME': 'workflow_dispatch',
    'GITHUB_REF': 'refs/heads/main',
    'GITHUB_REPOSITORY': 'danialyermekov/careerflow',
    'GITHUB_SHA': SHA,
    'GITHUB_RUN_ID': '123',
    'GITHUB_RUN_ATTEMPT': '1',
    'REACT_APP_SUPABASE_URL': 'https://test.supabase.co',
    'REACT_APP_SUPABASE_PUBLISHABLE_KEY': 'sb_publishable_public',
}


class Azure:
    """Return the safe projections emitted by Azure CLI, recording write requests."""

    def __init__(self):
        self.app = {
            'id': '/subscriptions/test/resourceGroups/careerflow-rg/providers/Microsoft.App/containerApps/careerflow',
            'mode': 'Single', 'latest': 'careerflow--old', 'ready': 'careerflow--old',
            'containers': [{'name': 'careerflow', 'image': 'careerflowacr.azurecr.io/careerflow:previous'}],
            'scale': {'minReplicas': 0, 'maxReplicas': 1},
            'ingress': {'external': True, 'targetPort': 8000, 'customDomains': [{'name': 'careerflow.live'}]},
        }
        self.registry = {'loginServer': 'careerflowacr.azurecr.io', 'roleAssignmentMode': 'LegacyRegistryPermissions'}
        self.digest = DIGEST
        self.writes = []
        self.stale = False
        self.wrong_image = False
        self.running = 'Running'

    def __call__(self, *args):
        command = args[:2]
        if command == ('containerapp', 'show'):
            return copy.deepcopy(self.app)
        if command == ('acr', 'show'):
            return copy.deepcopy(self.registry)
        if command == ('acr', 'login'):
            return {}
        if args[:3] == ('acr', 'repository', 'show'):
            return self.digest
        if command == ('containerapp', 'update'):
            self.writes.append(args)
            self.app['containers'][0]['image'] = args[args.index('--image') + 1]
            self.app['latest'] = 'careerflow--new'
            if not self.stale:
                self.app['ready'] = 'careerflow--new'
            return {}
        if args[:3] == ('containerapp', 'revision', 'show'):
            return {
                'name': self.app['latest'], 'active': True, 'provisioning': 'Provisioned',
                'health': 'Healthy', 'running': self.running, 'traffic': 100,
                'image': 'wrong-image' if self.wrong_image else self.app['containers'][0]['image'],
            }
        raise AssertionError(f'Unexpected Azure operation: {args[:3]}')


class DeploymentTests(unittest.TestCase):
    def test_workflow_uses_exact_repository_secret_names_at_guard_and_build(self):
        workflow = (Path(__file__).resolve().parents[1] / 'workflows' / 'deploy.yml').read_text(encoding='utf-8')
        for name in ('REACT_APP_SUPABASE_URL', 'REACT_APP_SUPABASE_PUBLISHABLE_KEY'):
            self.assertEqual(workflow.count('${{ secrets.' + name + ' }}'), 2)
            self.assertNotIn('${{ vars.' + name + ' }}', workflow)

    def test_workflow_builds_before_oidc_and_preserves_manual_ci_gate(self):
        workflow = (Path(__file__).resolve().parents[1] / 'workflows' / 'deploy.yml').read_text(encoding='utf-8')
        self.assertLess(workflow.index('docker/build-push-action@'), workflow.index('azure/login@'))
        for required in ('workflow_dispatch:', 'needs: checks', 'uses: ./.github/workflows/ci.yml',
                         'group: careerflow-production', 'cancel-in-progress: false', 'platforms: linux/amd64',
                         'load: true', 'push: false', 'persist-credentials: false',
                         'DOCKER_BUILD_RECORD_UPLOAD:', 'cache-to: type=gha', 'if: always()'):
            self.assertIn(required, workflow)
        self.assertNotIn('acr build', workflow)
        self.assertNotIn('acr task', workflow)

    def test_prepare_emits_tag_and_normalized_public_build_config_without_logging_values(self):
        with tempfile.TemporaryDirectory() as directory:
            output, environment = Path(directory) / 'output', Path(directory) / 'env'
            with patch.dict(os.environ, {'GITHUB_OUTPUT': str(output), 'GITHUB_ENV': str(environment)}), \
                    patch('deploy.az') as azure, redirect_stdout(io.StringIO()) as logs:
                deploy.prepare_image()
            self.assertEqual(output.read_text(), 'tag=' + deploy.SERVER + '/careerflow:' + PREFIX + '123-1\n')
            self.assertIn('REACT_APP_API_URL=\n', environment.read_text())
            self.assertNotIn('sb_publishable_public', output.read_text() + logs.getvalue())
            azure.assert_not_called()

    def test_configuration_rejects_multiline_url_before_output_or_build(self):
        with patch.dict(os.environ, {'REACT_APP_SUPABASE_URL': 'https://test.supabase.co\nINJECTED=value'}):
            with self.assertRaises(RuntimeError):
                deploy.deployment_config()

    def setUp(self):
        self.azure = Azure()
        self.messages = []
        self.docker = patch('deploy.command', return_value='tag: digest: ' + DIGEST + ' size: 123')
        self.docker_mock = self.docker.start()
        self.addCleanup(self.docker.stop)
        self.environment = patch.dict(os.environ, ENV, clear=True)
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def run_deployment(self, health=True):
        probe = patch('deploy.health_ok', side_effect=health if isinstance(health, list) or callable(health) else None, return_value=health)
        with patch('deploy.az', self.azure), patch('deploy.time.sleep'), \
                patch('deploy.time.monotonic', side_effect=range(0, 100_000, 10)), probe as request, \
                patch('deploy.summary', side_effect=self.messages.append), redirect_stdout(io.StringIO()):
            deploy.main()
        return request

    def test_non_main_events_and_missing_public_configuration_never_write(self):
        invalid = {
            'GITHUB_REF': 'refs/heads/feature', 'GITHUB_EVENT_NAME': 'push',
            'GITHUB_REPOSITORY': 'someone/careerflow', 'GITHUB_SHA': 'not-a-sha',
            'REACT_APP_SUPABASE_URL': '', 'REACT_APP_SUPABASE_PUBLISHABLE_KEY': 'sb_secret_do-not-bake',
        }
        for name, value in invalid.items():
            with self.subTest(name=name), patch.dict(os.environ, {name: value}):
                with self.assertRaises(RuntimeError):
                    self.run_deployment()
                self.assertEqual(self.azure.writes, [])

    def test_unexpected_topology_never_builds_or_updates(self):
        changes = [
            ('mode', 'Multiple'), ('ready', 'careerflow--different'),
            ('scale', {'minReplicas': 0, 'maxReplicas': 2}),
            ('ingress', {'external': True, 'targetPort': 8080, 'customDomains': []}),
        ]
        for name, value in changes:
            with self.subTest(name=name):
                self.azure = Azure()
                self.azure.app[name] = value
                with self.assertRaises(RuntimeError):
                    self.run_deployment()
                self.assertEqual(self.azure.writes, [])

    def test_abac_requires_explicit_review_instead_of_permission_expansion(self):
        self.azure.registry['roleAssignmentMode'] = 'AbacRepositoryPermissions'
        with self.assertRaisesRegex(RuntimeError, 'ABAC'):
            self.run_deployment()
        self.assertEqual(self.azure.writes, [])

    def test_push_updates_only_image_by_registry_confirmed_digest(self):
        self.run_deployment()
        self.docker_mock.assert_called_once_with(
            'docker', ('push', deploy.SERVER + '/careerflow:' + PREFIX + '123-1'), timeout=1800)
        self.assertEqual(self.azure.writes, [(
            'containerapp', 'update', '--name', 'careerflow', '--resource-group', 'careerflow-rg',
            '--container-name', 'careerflow', '--image', IMAGE, '--no-wait', '--output', 'none',
        )])
        notes = '\n'.join(self.messages)
        for value in ('careerflow--old', 'careerflowacr.azurecr.io/careerflow:previous', IMAGE):
            self.assertIn(value, notes)
        self.assertNotIn('sb_publishable_public', notes)

    def test_tag_tracks_commit_configuration_and_unique_attempt(self):
        tag = deploy.image_tag(SHA, deploy.build_config())
        self.assertEqual(tag, PREFIX + '123-1')
        with patch.dict(os.environ, {'GITHUB_RUN_ATTEMPT': '2'}):
            self.assertNotEqual(tag, deploy.image_tag(SHA, deploy.build_config()))
        with patch.dict(os.environ, {'REACT_APP_SUPABASE_URL': 'https://other.supabase.co'}):
            self.assertNotEqual(tag, deploy.image_tag(SHA, deploy.build_config()))
        with patch.dict(os.environ, {'GITHUB_RUN_ID': 'invalid'}):
            with self.assertRaises(RuntimeError):
                self.run_deployment()
        self.assertEqual(self.azure.writes, [])

    def test_push_failure_never_updates_production(self):
        self.docker_mock.side_effect = RuntimeError('Push rejected')
        with self.assertRaisesRegex(RuntimeError, 'Push rejected'):
            self.run_deployment()
        self.assertEqual(self.azure.writes, [])

    def test_invalid_or_mismatched_digest_never_updates_production(self):
        for output, registry in [('no digest', DIGEST), ('digest: sha256:invalid', DIGEST),
                                 ('digest: ' + DIGEST, 'sha256:' + 'c' * 64),
                                 ('digest: ' + DIGEST + ' digest: ' + DIGEST, DIGEST)]:
            with self.subTest(output=output):
                self.docker_mock.return_value = output
                self.azure.digest = registry
                with self.assertRaisesRegex(RuntimeError, 'digest'):
                    self.run_deployment()
                self.assertEqual(self.azure.writes, [])

    def test_healthy_old_revision_is_not_accepted(self):
        self.azure.stale = True
        with self.assertRaisesRegex(RuntimeError, 'verification.*timed out'):
            self.run_deployment(health=True)
        self.assertEqual(len(self.azure.writes), 1)

    def test_wrong_revision_image_is_not_accepted(self):
        self.azure.wrong_image = True
        with self.assertRaisesRegex(RuntimeError, 'verification.*timed out'):
            self.run_deployment()

    def test_cold_start_retries_then_verifies_the_running_revision(self):
        self.azure.running = 'ScaledToZero'
        attempts = iter([False, False, True])

        def health():
            healthy = next(attempts)
            if healthy:
                self.azure.running = 'RunningAtMaxScale'
            return healthy

        request = self.run_deployment(health=health)
        self.assertEqual(request.call_count, 3)
        self.assertIn('careerflow--new', self.messages[-1])

    def test_maximum_scale_revision_is_healthy(self):
        self.azure.running = 'RunningAtMaxScale'
        request = self.run_deployment()
        self.assertEqual(request.call_count, 1)
        self.assertIn('Deployment verified', self.messages[-1])

    def test_unhealthy_endpoint_is_bounded_without_automatic_rollback(self):
        with self.assertRaisesRegex(RuntimeError, 'verification.*timed out'):
            self.run_deployment(health=False)
        self.assertEqual(len(self.azure.writes), 1)

    def test_already_deployed_digest_does_not_create_a_revision(self):
        self.azure.app['containers'][0]['image'] = IMAGE
        self.run_deployment()
        self.assertEqual(self.azure.writes, [])

    def test_successful_acr_login_does_not_parse_docker_stdout_as_json(self):
        self.docker.stop()
        result = subprocess.CompletedProcess([], 0, stdout='Login Succeeded\n', stderr='')
        with patch('deploy.subprocess.run', return_value=result):
            self.assertEqual(deploy.az('acr', 'login', '--name', deploy.REGISTRY, '--output', 'none'), {})

    def test_json_commands_still_parse_and_reject_invalid_json(self):
        self.docker.stop()
        for stdout, expected in [('"' + DIGEST + '"', DIGEST), ('{"mode":"Single"}', {'mode': 'Single'})]:
            with patch('deploy.subprocess.run', return_value=subprocess.CompletedProcess([], 0, stdout, '')):
                self.assertEqual(deploy.az('acr', 'repository', 'show', '--output', 'json'), expected)
        with patch('deploy.subprocess.run', return_value=subprocess.CompletedProcess([], 0, 'invalid', '')):
            with self.assertRaises(ValueError):
                deploy.az('acr', 'repository', 'show', '--output', 'json')

    def test_cli_error_reports_azure_reason_without_command_or_credentials(self):
        secret = 'private-build-value'
        args = ('acr', 'login', '--build-arg', f'CUSTOM={secret}', '--password=cli-password')
        result = subprocess.CompletedProcess([], 1, stdout='', stderr=(
            'ERROR: (AuthorizationFailed) Cannot queue build. Request ID: request-123\n'
            f"Command: az acr login --build-arg CUSTOM={secret} --password=cli-password\n"
            f'Build value: {secret}; password=cli-password'
        ))
        self.docker.stop()
        with patch('deploy.subprocess.run', return_value=result):
            with self.assertRaisesRegex(RuntimeError, 'acr login') as failure:
                deploy.az(*args)
        message = str(failure.exception)
        self.assertIn('exit 1', message)
        self.assertIn('AuthorizationFailed', message)
        self.assertIn('request-123', message)
        for value in (secret, 'cli-password', 'az acr login', 'CUSTOM='):
            self.assertNotIn(value, message)

    def test_cli_diagnostics_redact_environment_and_common_credentials(self):
        credentials = [
            'env-private-value', 'build-public-value', 'secret-build-value', 'unlabelled-cli-token',
            'bearer-value', 'basic-value', 'json-password', 'client-secret-value',
            'url-user', 'url-password', 'sas-value', 'db-password',
            'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.signature',
            'sb_secret_private', 'sb_publishable_public',
        ]
        output = (
            'ERROR: InvalidArgument; correlation-id=correlation-123\n'
            'env-private-value build-public-value secret-build-value unlabelled-cli-token\n'
            'Authorization: Bearer bearer-value\nAuthorization: Basic basic-value\n'
            '{"password": "json-password", "clientSecret": "client-secret-value"}\n'
            'https://url-user:url-password@example.com/upload?sv=2026&sig=sas-value\n'
            'AccountKey=db-password;Database=example\n'
            'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.signature sb_secret_private sb_publishable_public'
        )
        args = ('acr', 'login', '--build-arg=CUSTOM=build-public-value',
                '--secret-build-arg', 'OTHER=secret-build-value', '--access-token', 'unlabelled-cli-token')
        with patch.dict(os.environ, {'AZURE_CLIENT_SECRET': credentials[0]}):
            cleaned = deploy.redact_diagnostics(output, args)
        self.assertIn('InvalidArgument', cleaned)
        self.assertIn('correlation-123', cleaned)
        for value in credentials:
            self.assertNotIn(value, cleaned)

    def test_cli_failure_includes_stdout_and_handles_empty_output(self):
        for stdout, stderr, expected in (
            ('ERROR: Upload failed', '', 'Upload failed'),
            ('Upload context failed', 'ERROR: Request rejected', 'Upload context failed'),
            ('', '', 'No Azure CLI error output was captured'),
        ):
            self.docker.stop()
            with self.subTest(stdout=stdout), patch('deploy.subprocess.run', return_value=
                    subprocess.CompletedProcess([], 1, stdout=stdout, stderr=stderr)):
                with self.assertRaisesRegex(RuntimeError, expected):
                    deploy.az('acr', 'login')

    def test_cli_timeout_reports_redacted_partial_output(self):
        timeout = subprocess.TimeoutExpired(['az', 'acr', 'login', '--password', 'hidden-value'], 60,
                                            output=b'Upload started', stderr=b'ERROR: token=hidden-value')
        self.docker.stop()
        with patch('deploy.subprocess.run', side_effect=timeout):
            with self.assertRaisesRegex(RuntimeError, '60s command timeout') as failure:
                deploy.az('acr', 'login', '--password', 'hidden-value')
        self.assertIn('Upload started', str(failure.exception))
        self.assertNotIn('hidden-value', str(failure.exception))

    def test_docker_push_timeout_reports_redacted_output_without_updating(self):
        self.docker.stop()
        timeout = subprocess.TimeoutExpired(['docker', 'push'], 1800, stderr=b'ERROR: password=hidden-value')
        with patch('deploy.subprocess.run', side_effect=timeout), patch('deploy.az', self.azure):
            with self.assertRaisesRegex(RuntimeError, '1800s command timeout') as failure:
                deploy.main()
        self.assertNotIn('hidden-value', str(failure.exception))
        self.assertEqual(self.azure.writes, [])

    def test_diagnostics_redact_escaped_values_and_multiline_credentials(self):
        value = 'private value/with+punctuation'
        output = (
            'ERROR: Context upload rejected\n'
            'private%20value%2Fwith%2Bpunctuation private+value%2Fwith%2Bpunctuation\n'
            '--secret-build-arg "UNKNOWN=two private words"\n'
            '--build-arg UNKNOWN=private-comma,private-semicolon;private-query&private-tail\n'
            '{"refresh_token": "two\\nprivate words", "username": "private-user"}\n'
            '{"password": "escaped\\\"private-password", "accessToken": "escaped\\\\private-token"}\n'
            '-----BEGIN RSA PRIVATE KEY-----\nprivate-key-body\n-----END RSA PRIVATE KEY-----\n'
            'ghp_privategithubtoken github_pat_privategithubtoken\n'
        )
        cleaned = deploy.redact_diagnostics(output, ('acr', 'login', '--build-arg', f'NAME={value}'))
        self.assertIn('Context upload rejected', cleaned)
        for secret in ('private%', 'private+', 'UNKNOWN=', 'two private words', 'two\\nprivate words',
                       'private-user', 'private-password', 'private-token', 'private-key-body',
                       'private-comma', 'private-semicolon', 'private-query', 'private-tail', 'ghp_', 'github_pat_'):
            self.assertNotIn(secret, cleaned)

    def test_diagnostics_are_bounded_and_cannot_inject_workflow_commands(self):
        cleaned = deploy.redact_diagnostics('ERROR: rejected\n::warning::injected\x1b\x00' + 'x' * 7000, ())
        self.assertTrue(cleaned.startswith('ERROR: rejected'))
        self.assertLessEqual(len(cleaned), 6000)
        for character in ('\n', '\r', '\x1b', '\x00'):
            self.assertNotIn(character, cleaned)

    def test_login_failure_never_pushes_or_updates(self):
        original = self.azure
        def azure(*args):
            if args[:2] == ('acr', 'login'):
                raise RuntimeError('ACR login denied')
            return original(*args)
        with patch('deploy.az', side_effect=azure), patch('deploy.summary'):
            with self.assertRaisesRegex(RuntimeError, 'ACR login denied'):
                deploy.main()
        self.docker_mock.assert_not_called()
        self.assertEqual(self.azure.writes, [])


if __name__ == '__main__':
    unittest.main()
