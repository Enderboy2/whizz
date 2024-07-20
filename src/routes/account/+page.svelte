<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import Search from './Search.svelte';
  import type { SupabaseClient } from '@supabase/supabase-js';
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';
  import Navbar from './Navbar.svelte';

  export let data: {
    session: any;
    supabase: SupabaseClient;
    profile: {
      id: number;
      username: string;
      selected_syllabus: string; // Assuming selected_syllabus is stored as comma-separated IDs
    };
  };

  let { session, supabase, profile } = data;
  let loading = false;
  let username = profile?.username ?? '';
  let selected_syllabus = profile?.selected_syllabus ?? '';
  let showSearch = false;

  const dispatch = createEventDispatcher();

  const handleSignOut: SubmitFunction = () => {
    loading = true;
    return async ({ update }) => {
      loading = false;
      update();
    };
  };

  const syllabusIsSelected = (syllabusId: number) => {
    if (!selected_syllabus || selected_syllabus === "NULL") return false;
    const selectedIds = selected_syllabus.split(',');
    return selectedIds.includes(syllabusId.toString());
  };

  const addToProfile = async (syllabusId: number) => {
    try {
      let updatedSyllabusIds = '';

      if (!selected_syllabus || selected_syllabus === "NULL") {
        updatedSyllabusIds = syllabusId.toString();
      } else {
        const selectedIds = selected_syllabus.split(',');
        if (!selectedIds.includes(syllabusId.toString())) {
          updatedSyllabusIds = `${selected_syllabus},${syllabusId}`;
        } else {
          console.log(`Syllabus ${syllabusId} is already selected, nothing added`);
          return;
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ selected_syllabus: updatedSyllabusIds })
        .eq('id', session.user.id);

      if (error) {
        console.error('Error updating profile:', error.message);
        return;
      }

      selected_syllabus = updatedSyllabusIds;
      profile.selected_syllabus = updatedSyllabusIds;

    } catch (error) {
      console.error('Error adding to profile:', error);
    }
  };

  const toggleSearch = () => {
    showSearch = !showSearch;
  };
  console.log(profile.selected_syllabus.split(',').map((id: string) => parseInt(id,10)))
</script>
{#key selected_syllabus}
  <Navbar supabase={supabase} selected_syllabus={selected_syllabus}/>
{/key}


{#if (!selected_syllabus || selected_syllabus === "NULL")}
<div class="font-space text-white bg-gray-900 min-h-screen p-8 w-full">
  <h1 class="text-3xl font-bold mb-4">Hi {username}, Welcome to Whizz!</h1>
  <h2 class="text-xl mb-6">I see you haven't selected your subjects yet, care to do so?</h2>
  {#if showSearch}
    <div class="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 p-4 rounded shadow-lg z-50">
      <Search 
        syllabusIsSelected={syllabusIsSelected}
        addToProfile={addToProfile} 
        supabase={supabase}
      />
    </div>
  {/if}
</div>
{:else}
<div class="font-space text-white bg-gray-900 min-h-screen p-8 w-full">
  <h2 class="text-2xl font-bold mb-4">Selected Syllabuses:</h2>
  <ul class="mb-6">
    {#each selected_syllabus.split(',') as syllabusId}
      <li class="py-2">
        <p>{syllabusId}</p>
      </li>
    {/each}
  </ul>
  {#if showSearch}
    <div class="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 p-4 rounded shadow-lg z-50">
      <Search 
        syllabusIsSelected={syllabusIsSelected}
        addToProfile={addToProfile} 
        supabase={supabase}
      />
    </div>
  {/if}
</div>
{/if}

<form method="post" action="?/signout" use:enhance={handleSignOut} class="mt-8 fixed bottom-7 right-5">
  <div>
    <button class="button bg-red-600 text-white py-2 px-4 rounded disabled:bg-gray-500" disabled={loading}>Sign Out</button>
  </div>
</form>

<!-- Search button at the bottom left corner -->
<button class="fixed bottom-4 left-4 bg-blue-500 text-white p-2 rounded-full shadow-lg" on:click={toggleSearch}>
  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35m2.12-5.35a7 7 0 11-14 0 7 7 0 0114 0z"></path>
  </svg>
</button>




<style>
  .fixed { position: fixed; }
  
</style>
