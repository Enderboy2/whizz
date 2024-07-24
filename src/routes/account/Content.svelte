<script lang="ts">
  import type { SupabaseClient } from "@supabase/supabase-js";

  export let syllabusData: any;
  export let supabase: SupabaseClient;
  syllabusData = syllabusData[0];
  let name = syllabusData.syllabus_name;
  let level = syllabusData.syllabus_level;
  let code = syllabusData.syllabus_code;
  let board = syllabusData.syllabus_board;
  let syllabusChapters: any;
  let isOpen: boolean = true;

  const build = async (id: any) => {
    console.log("building syllabus data...");
    try {
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .in("syllabus_id", id);

      if (error) {
        console.error("Supabase search error:", error.message);
        return [];
      }

      return data ?? [];
    } catch (error: any) {
      console.error("building failed:", error.message);
      return [];
    }
  };

  const fetchData = async () => {
    try {
      syllabusChapters = await build([syllabusData.syllabus_id]);
      //console.log(syllabusData); // Logs the resolved value of the promise
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };
  fetchData();
  console.log(syllabusChapters);
</script>

{#if !syllabusChapters}
  {#key syllabusChapters}
    <div
      class={`flex flex-col min-h-screen bg-gray-700 text-white ${isOpen ? "sidebar-open" : "sidebar-closed"}`}
    >
      <h1>sidebar</h1>
      {syllabusChapters}
    </div>

    <div class="font-space text-white bg-gray-800 min-h-screen p-8 w-full">
      <h1>{name}</h1>
      <h2>{level} - {board}</h2>
    </div>
  {/key}
{/if}
