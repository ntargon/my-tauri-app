<script>
	import TcpSender from '$lib/components/TcpSender.svelte';
</script>

<div class="container mx-auto space-y-8 p-8">
	<header class="space-y-2 text-center">
		<h1 class="text-3xl font-bold">TCP通信アプリ</h1>
		<p class="text-muted-foreground">TCP送信・受信機能</p>
	</header>

	<section class="space-y-4">
		<div class="flex justify-center">
			<TcpSender />
		</div>
	</section>
</div>
