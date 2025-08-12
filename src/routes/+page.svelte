<script>
	import { Button } from '$lib/components/ui/button/index.js';
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<div class="mt-8 space-y-4">
	<h2 class="text-xl font-bold">shadcn-svelte Components</h2>

	<div class="flex gap-4">
		<Button>Default Button</Button>
		<Button variant="secondary">Secondary</Button>
		<Button variant="outline">Outline</Button>
		<Button variant="ghost">Ghost</Button>
		<Button variant="destructive">Destructive</Button>
	</div>

	<div class="flex gap-4">
		<Button size="sm">Small</Button>
		<Button size="default">Default</Button>
		<Button size="lg">Large</Button>
	</div>
</div>
