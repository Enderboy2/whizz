<!-- src/routes/account/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

  	import { onMount } from 'svelte';
  	import { debounce } from 'lodash';

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


	let query = '';
	let results: Array<any> = [];
		const search = debounce(async (query: string) => {
    if (query) {
      const { data, error } = await supabase
        .from('syllabus')
        .select('*')
        .or(`syllabus_name.ilike.%${query}%,syllabus_code.ilike.%${query}%`);

      if (error) {
        console.error(error);
        return;
      }

      results = data;
    } else {
      results = [];
    }
  }, 300); // 300ms debounce

  // Watch for changes in the query
  $: search(query);

</script>

{#if selected_syllabus === "NULL"}

<div class="font-space">
	<h1 >Hi {username}, Welcome to Whizz!</h1>
	<h2 >I see you hevent selected your subjects yet, care to do so?</h2>
	<input type="text" bind:value={query} placeholder="Search..." />
	<ul>
		{#each results as result}
			<li>
				<p>{result.syllabus_name}</p>
				<p>{result.syllabus_code}</p>
				<p>{result.syllabus_level}</p>
			</li>
		{/each}
	</ul>
	
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