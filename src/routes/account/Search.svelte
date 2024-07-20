<script lang="ts">
    import { writable } from 'svelte/store';
    import type { SupabaseClient } from '@supabase/supabase-js';
  
    export let supabase: SupabaseClient;
    export let syllabusIsSelected: (syllabusId: number) => boolean;
    export let addToProfile: (syllabusId: number) => Promise<void>;
    
    let query = '';
    let results: Array<any> = [];
  
    const search = async (query: string) => {
      console.log('Searching for:', query); // Debug log
  
      if (query) {
        try {
          let queryBuilder = supabase.from('syllabus').select('*');
  
          // Check if query contains characters (indicating text search)
          if (/[a-zA-Z]/.test(query)) {
            queryBuilder = queryBuilder.or(`syllabus_name.ilike.%${query}%`);
          } else {
            // Otherwise, assume it's a numeric search
            const numericValue = parseInt(query, 10);
            queryBuilder = queryBuilder.or(`syllabus_code.eq.${numericValue}`);
          }
  
          const { data, error } = await queryBuilder;
  
          if (error) {
            console.error('Supabase search error:', error.message);
            return;
          }
  
          console.log('Search results:', data); // Debug log
          results = data ?? [];
        } catch (error) {
          console.error('Error performing search:', error);
        }
      } else {
        results = [];
      }
    };
  
    $: search(query); 
    // Reactive statement to trigger search on query change
    export const selectedSyllabus= writable<any>(null);

  const openPopup = (result: any) => {
    selectedSyllabus.set(result);
    console.log("opened poppup");
  };

  const closePopup = () => {
    selectedSyllabus.set(null);
  };
  
  </script>
  
  <style>
    .popup-background {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
  
    .popup-content {
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      max-width: 80%;
      max-height: 80%;
      overflow-y: auto;
      text-align: center;
    }
  </style>
  
  
  <div>
    <input type="text" bind:value={query} placeholder="Search..." />
    <ul>
      {#each results as result}
        <div class="syllabus-item">
            <h3>{result.syllabus_name}</h3>
            <p>Level: {result.syllabus_level}</p>
            <p>Code: {result.syllabus_code}</p>
            <button on:click={() => openPopup(result)}>
                <p>add</p>
            </button>
        </div>
      {/each}
    </ul>
  </div>
  
  <!-- Popup/modal for selected syllabus -->
{#if $selectedSyllabus !== null}
<div class="popup-background">
  <div class="popup-content">
    <h2>{$selectedSyllabus.syllabus_name}</h2>
    <p>Level: {$selectedSyllabus.syllabus_level}</p>
    <p>Code: {$selectedSyllabus.syllabus_code}</p>
    {#if syllabusIsSelected($selectedSyllabus.syllabus_id)}
      <p>Already Selected</p>
    {:else}
      <button on:click={() => addToProfile($selectedSyllabus.syllabus_id)}>
        Add to Profile
      </button>
    {/if}
    <button on:click={closePopup}>Close</button>
  </div>
</div>
{/if}