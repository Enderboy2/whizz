<script lang="ts">
    import type { SupabaseClient } from '@supabase/supabase-js';
    
    export let supabase: SupabaseClient;
    import { onMount } from 'svelte';
  
    let query = '';
    let results: Array<any> = [];
  
    const search = async (query: string) => {
      if (query) {
        const { data, error } = await supabase
          .from('syllabus')  // Replace 'your-table' with the actual table name
          .select('*')
          .or(`syllabus_name.ilike.%${query}%,syllabus_code.ilike.%${query}%`); // Replace 'column1' and 'column2' with actual column names
  
        if (error) {
          console.error('Search error:', error);
          return;
        }
  
        results = data;
      } else {
        results = [];
      }
    };
  
    $: search(query); // Reactive statement to trigger search on query change
  </script>
  
  <style>
    /* Add your custom styles here */
  </style>
  
  <div>
    <input type="text" bind:value={query} placeholder="Search..." />
    <ul>
      {#each results as result}
        <li>
          <!-- Customize this part to display your result details -->
          <p>{result.syllabus_name}</p> <!-- Replace 'column1' with actual column name -->
          <p>{result.syllabus_level}</p> <!-- Replace 'column2' with actual column name -->
        </li>
      {/each}
    </ul>
  </div>
  