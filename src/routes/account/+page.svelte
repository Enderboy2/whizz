<!-- src/routes/account/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Search from './Search.svelte';
    import type { SupabaseClient } from '@supabase/supabase-js';
    import { createEventDispatcher } from 'svelte';

	export let data: {
    session: any;
    supabase: SupabaseClient;
    profile: {
      id: number;
      username: string;
      selected_syllabus: string; // Assuming selected_syllabus is stored as comma-separated IDs
    };
  };
	let { session, supabase, profile } = data
	$: ({ session, supabase, profile } = data)

	let loading = false
	let username:string
	let selected_syllabus:string

	if(profile){
		username= profile.username ?? ''
		selected_syllabus= profile.selected_syllabus ?? ''
	}else{
		username = ''
		selected_syllabus = ''
	}
	const dispatch = createEventDispatcher();
	const handleSignOut: SubmitFunction = () => {
		loading = true
		return async ({ update }) => {
			loading = false
			update()
		};
	};
	const syllabusIsSelected = (syllabusId: number) => {
    if (!profile || profile.selected_syllabus === "NULL" || profile.selected_syllabus === null || profile.selected_syllabus === '') {
      return false;
    }
    const selectedIds = profile.selected_syllabus.split(',');
    return selectedIds.includes(syllabusId.toString());
  };

  // Function to add syllabus to profile
  const addToProfile = async (syllabusId: number) => {
  try {
    let updatedSyllabusIds = '';

    // Check if selected_syllabus is currently "NULL" or starts with "NULL,"
    if (!profile || profile.selected_syllabus === "NULL" || profile.selected_syllabus === null || profile.selected_syllabus === '') {
      updatedSyllabusIds = syllabusId.toString();
    } else {
      // Split existing IDs and check if syllabusId already exists
      const selectedIds = profile.selected_syllabus.split(',');
      if (!selectedIds.includes(syllabusId.toString())) {
        // Append to existing IDs
        updatedSyllabusIds = `${profile.selected_syllabus},${syllabusId}`;
      } else {
        // Syllabus already selected, handle as per your app logic (optional)
        console.log(`Syllabus ${syllabusId} is already selected`);
        return;
      }
    }

    // Update profile column with updatedSyllabusIds
    const { data, error } = await supabase
      .from('profiles')
      .update({ selected_syllabus: updatedSyllabusIds })
      .eq('id', profile.id);

    if (error) {
      console.error('Error updating profile:', error.message);
      return;
    }

    // Optionally, close the popup/modal after successful update
    // dispatch('close'); // Uncomment if needed
  } catch (error) {
    console.error('Error adding to profile:', error);
  }
};



</script>

{#if (selected_syllabus === "NULL")  ||  (selected_syllabus === null) || (selected_syllabus === '')}

<div class="font-space">
	<h1 >Hi {username}, Welcome to Whizz!</h1>
	<h2 >I see you hevent selected your subjects yet, care to do so?</h2>
	<Search 
	syllabusIsSelected={syllabusIsSelected}
    addToProfile={addToProfile} 
	supabase={supabase}
	/>	
</div>
{:else}

<h2>Selected Syllabuses:</h2>
    <ul>
      {#each selected_syllabus.split(',') as syllabusId}
        <li>
          <p>{syllabusId}</p>
        </li>
      {/each}
    </ul>

{/if}

<form method="post" action="?/signout" use:enhance={handleSignOut}>
	<div>
		<button class="button block" disabled={loading}>Sign Out</button>
	</div>
</form>