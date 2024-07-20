<!-- src/lib/Navbar.svelte -->
<script lang='ts'>
  import type { SupabaseClient } from "@supabase/supabase-js";

  export let supabase: SupabaseClient;
  export let selected_syllabus: any;
  
  let syllabus_ids: any = selected_syllabus.split(',');
  syllabus_ids = syllabus_ids.map((id: string) => parseInt(id, 10));
  
  // Reactive variable to hold the results
  let syllabusData: any[] = [];

  const build = async (ids: any) => {
      console.log('building syllabus data...');
      try {
          const { data, error } = await supabase.from('syllabus').select('*').in('syllabus_id', ids);
          
          if (error) {
              console.error('Supabase search error:', error.message);
              return [];
          }
          
          return data ?? [];
      } catch (error: any) {
          console.error('building failed:', error.message);
          return [];
      }
  };

  // Fetch data and assign to syllabusData
  const fetchData = async () => {
      console.log(syllabus_ids);
      try {
          syllabusData = await build(syllabus_ids);
          //console.log(syllabusData); // Logs the resolved value of the promise
      } catch (error) {
          console.error('Error fetching data:', error);
      }
  };

  // Call fetchData to populate syllabusData
  fetchData();
</script>

<div class="top-0 left-0 h-screen w-16 m-0 flex flex-col bg-gray-900 text-white shadow-lg p-2">
  {#if syllabusData.length > 0}
    <div >
        {#each syllabusData as syllabus}
        <div class="sidebar-icon group">
          {syllabus.syllabus_name[0]}
          <span class="sidebar-tooltip group-hover:scale-100">
            {syllabus.syllabus_level}
        </span>
        </div>
        {/each}
    </div>
    {/if}
</div>
