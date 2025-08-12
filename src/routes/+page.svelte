<script>
	import { Button } from '$lib/components/ui/button/index.js';
	import TcpSender from '$lib/components/TcpSender.svelte';
</script>

<div class="container mx-auto space-y-8 p-8">
	<header class="space-y-2 text-center">
		<h1 class="text-3xl font-bold">SvelteKit + Tauri アプリ</h1>
		<p class="text-muted-foreground">TCP通信機能とUIコンポーネントのデモンストレーション</p>
	</header>

	<section class="space-y-4">
		<h2 class="text-2xl font-bold">TCP メッセージ送信</h2>
		<div class="flex justify-center">
			<TcpSender />
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-bold">shadcn-svelte Components</h2>

		<div class="flex flex-wrap gap-4">
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
	</section>

	<footer class="pt-8 text-center text-sm text-muted-foreground">
		<p>
			Visit <a href="https://svelte.dev/docs/kit" class="underline">svelte.dev/docs/kit</a> to read the
			documentation
		</p>
	</footer>
</div>
