<!-- src/routes/account/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	export let data
	let { session, supabase, profile } = data
	$: ({ session, supabase, profile } = data)

	let loading = false
	let username:string
	let selected_syllabus:string

	if(profile){
		username= profile.username ?? 'empty😢'
		selected_syllabus= profile.selected_syllabus ?? 'empty😢'
	}else{
		username= "null clown"
		selected_syllabus = "null stupid or empty i guess"
	}
	
	const handleSignOut: SubmitFunction = () => {
		loading = true
		return async ({ update }) => {
			loading = false
			update()
		}
	}
	import Search from './Search.svelte';
</script>

{#if selected_syllabus === "NULL"}

<div class="font-space">
	<h1 >Hi {username}, Welcome to Whizz!</h1>
	<h2 >I see you hevent selected your subjects yet, care to do so?</h2>
	<Search {supabase}/>	
</div>
{:else}

<div>
	<h1 class="font-bold underline text-3xl">you have selected -- {selected_syllabus}</h1>
</div>

{/if}

<form method="post" action="?/signout" use:enhance={handleSignOut}>
	<div>
		<button class="button block" disabled={loading}>Sign Out</button>
	</div>
</form>