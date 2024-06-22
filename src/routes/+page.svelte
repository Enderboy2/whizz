<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { Auth } from '@supabase/auth-ui-svelte';
	import { ThemeSupa } from '@supabase/auth-ui-shared';

	export let data;
</script>

<svelte:head>
	<title>Welcome to My App</title>
</svelte:head>

<div class="container">
	<h1>Welcome to My App</h1>
	<p>Login or Sign Up to get started.</p>
	<div class="row flex-center flex">
		<div class="col-6 form-widget">
			<Auth
				supabaseClient={data.supabase}
				view="sign_in" 
				redirectTo={`${data.url}/auth/callback`}
				showLinks={true} 
				appearance={{ theme: ThemeSupa, style: { input: 'color: #fff' } }}
				providers={['github']} 
			/>
		</div>
	</div>
</div>

<style>
	.container {
		padding: 50px;
		text-align: center;
	}
	.form-widget {
		margin: auto;
	}
</style>
