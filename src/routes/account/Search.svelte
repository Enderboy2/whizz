<script lang="ts">
    import type { SupabaseClient } from '@supabase/supabase-js';
  
    export let supabase: SupabaseClient;
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
          <p>{result.syllabus_name}, {result.syllabus_level}, {result.syllabus_code}</p> <!-- Adjust to display actual data -->
        </li>
      {/each}
    </ul>
  </div>
  