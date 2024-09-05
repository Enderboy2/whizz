<!-- src/lib/Navbar.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SupabaseClient } from "@supabase/supabase-js";

  export let supabase: SupabaseClient;
  export let selected_syllabus: any;
  export let switchActiveSyllabus: any;
  export let handleSignOut: any;
  export let toggleSearch: any;

  let syllabus_ids: any = selected_syllabus.split(",");
  syllabus_ids = syllabus_ids.map((id: string) => parseInt(id, 10));

  // Reactive variable to hold the results
  let syllabusData: any[] = [];

  const build = async (ids: any) => {
    console.log("building syllabus data...");
    try {
      const { data, error } = await supabase
        .from("syllabus")
        .select("*")
        .in("syllabus_id", ids);

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

  // Fetch data and assign to syllabusData
  const fetchData = async () => {
    try {
      syllabusData = await build(syllabus_ids);
      console.log(syllabusData); // Logs the resolved value of the promise
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Call fetchData to populate syllabusData
  $: if (!selected_syllabus || selected_syllabus === "NULL") {
    console.log("Empty sidebar");
  } else {
    fetchData();
  }
</script>

<div
  class="top-0 left-0 h-screen w-20 m-0 fixed flex flex-col bg-gray-900 text-white shadow-lg px-1 py-2"
>
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="group sidebar-icon" on:click={toggleSearch}> 🔎 
  <span class="sidebar-tooltip group-hover:scale-100 z-10 h-12 pt-4">search</span>
</div>

  {#if syllabusData.length > 0}
    {#each syllabusData as syllabus}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="sidebar-icon group"
        on:click={() => switchActiveSyllabus(syllabus.syllabus_id)}
      >
        {syllabus.syllabus_name[0]}
        <span class="sidebar-tooltip group-hover:scale-100 z-10">
          {syllabus.syllabus_name} - {syllabus.syllabus_level}
        </span>
      </div>
    {/each}
  {/if}

  <form
    method="post"
    action="?/signout"
    use:enhance={handleSignOut}
    class=" h-fit bottom-1 absolute"
  >
    <button class="sidebar-icon bg-red-500 hover:bg-red-600 overflow-hidden"
      >🚪
    </button>
  </form>
</div>
