"""Exercise deployment decisions without Azure writes or production HTTP requests."""

import copy
import io
import os
from pathlib import Path
import subprocess
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
        self.runs = []
        self.history_queries = []
        self.build_status = 'Succeeded'
        self.writes = []
        self.tag = PREFIX + 'cached'
        self.stale = False
        self.wrong_image = False
        self.running = 'Running'

    def image(self):
        return {'registry': 'careerflowacr.azurecr.io', 'repository': 'careerflow', 'tag': self.tag, 'digest': DIGEST}

    def __call__(self, *args):
        command = args[:2]
        if command == ('containerapp', 'show'):
            return copy.deepcopy(self.app)
        if command == ('acr', 'show'):
            return copy.deepcopy(self.registry)
        if args[:3] == ('acr', 'task', 'list-runs'):
            self.history_queries.append(args)
            return copy.deepcopy(self.runs)
        if command == ('acr', 'build'):
            self.writes.append(args)
            self.tag = args[args.index('--image') + 1].split(':', 1)[1].replace('{{.Run.ID}}', 'newrun')
            return {'runId': 'newrun'}
        if args[:3] == ('acr', 'task', 'show-run'):
            return {'runId': 'newrun', 'status': self.build_status, 'outputImages': [self.image()]}
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

    def setUp(self):
        self.azure = Azure()
        self.messages = []
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

    def test_successful_build_uses_public_arguments_and_updates_only_image(self):
        self.run_deployment()
        self.assertNotIn('--image', self.azure.history_queries[0])
        build, update = self.azure.writes
        self.assertEqual(build[:2], ('acr', 'build'))
        self.assertIn('REACT_APP_API_URL=', build)
        self.assertIn('REACT_APP_SUPABASE_URL=https://test.supabase.co', build)
        self.assertIn('REACT_APP_SUPABASE_PUBLISHABLE_KEY=sb_publishable_public', build)
        self.assertIn('careerflow:' + PREFIX + '{{.Run.ID}}', build)
        self.assertEqual(update, (
            'containerapp', 'update', '--name', 'careerflow', '--resource-group', 'careerflow-rg',
            '--container-name', 'careerflow', '--image', IMAGE, '--no-wait', '--output', 'none',
        ))
        notes = '\n'.join(self.messages)
        self.assertIn('careerflow--old', notes)
        self.assertIn('careerflowacr.azurecr.io/careerflow:previous', notes)
        self.assertIn(IMAGE, notes)
        self.assertNotIn('sb_publishable_public', notes)

    def test_retained_matching_build_is_reused_without_retagging(self):
        self.azure.runs = [{'status': 'Succeeded', 'outputImages': [self.azure.image()]}]
        self.run_deployment()
        self.assertNotIn('--image', self.azure.history_queries[0])
        self.assertEqual([args[:2] for args in self.azure.writes], [('containerapp', 'update')])

    def test_changed_public_configuration_does_not_reuse_old_frontend(self):
        self.azure.runs = [{'status': 'Succeeded', 'outputImages': [self.azure.image()]}]
        with patch.dict(os.environ, {'REACT_APP_SUPABASE_URL': 'https://other.supabase.co'}):
            self.run_deployment()
        self.assertEqual(self.azure.writes[0][:2], ('acr', 'build'))

    def test_build_failure_never_updates_production(self):
        self.azure.build_status = 'Failed'
        with self.assertRaisesRegex(RuntimeError, 'newrun'):
            self.run_deployment()
        self.assertEqual([args[:2] for args in self.azure.writes], [('acr', 'build')])

    def test_stuck_build_is_bounded_and_never_updates_production(self):
        self.azure.build_status = 'Running'
        with self.assertRaisesRegex(RuntimeError, 'build.*timed out'):
            self.run_deployment()
        self.assertEqual([args[:2] for args in self.azure.writes], [('acr', 'build')])

    def test_healthy_old_revision_is_not_accepted(self):
        self.azure.stale = True
        with self.assertRaisesRegex(RuntimeError, 'verification.*timed out'):
            self.run_deployment(health=True)
        self.assertEqual(len(self.azure.writes), 2)

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
        self.assertEqual(len(self.azure.writes), 2)

    def test_already_deployed_digest_does_not_create_a_revision(self):
        self.azure.runs = [{'status': 'Succeeded', 'outputImages': [self.azure.image()]}]
        self.azure.app['containers'][0]['image'] = IMAGE
        self.run_deployment()
        self.assertEqual(self.azure.writes, [])

    def test_cli_error_does_not_echo_credentials_or_raw_server_output(self):
        result = subprocess.CompletedProcess([], 1, stdout='', stderr='do-not-print-this-server-secret')
        with patch('deploy.subprocess.run', return_value=result):
            with self.assertRaisesRegex(RuntimeError, 'acr build') as failure:
                deploy.az('acr', 'build')
        self.assertNotIn('do-not-print-this-server-secret', str(failure.exception))


if __name__ == '__main__':
    unittest.main()
