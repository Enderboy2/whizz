<script lang="ts">
  import type { SupabaseClient } from "@supabase/supabase-js";
  import Outcomes from "./Outcomes.svelte";
  export let session: any
  export let supabase: SupabaseClient;
  export let syllabusData: any;
  export let addOutcomesToProfile: any;
  export let outcomes: string

  let syllabusChapters = (syllabusData as any).syllabusChapters.data;
  let name = syllabusData[0].syllabus_name;
  let level = syllabusData[0].syllabus_level;
  let code = syllabusData[0].syllabus_code;
  let board = syllabusData[0].syllabus_board;
  let isOpen: boolean = true;
  let activeChapter = syllabusChapters[0];


  const build = async (id: any) => {
    try {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .in("chapter_id", id);

      if (error) {
        console.error("Supabase search error:", error.message);
        return [];
      }

      return data;
    } catch (error: any) {
      console.error("building failed:", error.message);
      return [];
    }
  };

  const fetchData = async (id: any) => {
    try {
      activeChapter.topics = await build([id]);
      // Logs the resolved value of the promise
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const switchChapter = async (id: number) => {
    for (var i = 0; i < syllabusChapters.length; i++) {
      if (syllabusChapters[i].chapter_id === id) {
        activeChapter = syllabusChapters[i];
        await fetchData(activeChapter.chapter_id);
      }
    }
  };

  // Fetch initial data
  if (activeChapter && activeChapter.chapter_id) {
    fetchData(activeChapter.chapter_id);
  }
  let done = false;
</script>

{#if syllabusData && syllabusData != "NULL"}
  {#key syllabusData}
    <div class="flex flex-row w-full font-space ml-20 z-20">
      <div
        class={`flex flex-col min-h-screen max-h-screen fixed align-center overflow-hidden w-24 bg-gray-800 text-white z-0`}
      >
        <h1 class="mx-auto mt-2 font-bold mb-0">{name}</h1>
        <h5 class=" mx-auto text-sm">{level} - {board}</h5>
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        {#if syllabusChapters && syllabusChapters.length != 0}
          {#each syllabusChapters as c}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class="chapter-icon group mx-auto my-2 max-h-fit z-0"
              on:click={() => {
                switchChapter(c.chapter_id);
              }}
            >
              {c.chapter_number}
              <span
                class="sidebar-tooltip group-hover:scale-100 bg-gray-900 "
              >
                {c.chapter_name}
              </span>
            </div>
          {/each}
        {/if}
      </div>

      {#key activeChapter}
        <div
          class="font-space text-white bg-gray-900 min-h-screen pt-2 px-4 w-full ml-24 z-0"
        >
          {#if syllabusChapters && syllabusChapters.length != 0 && activeChapter && activeChapter.topics}
            <div class="p-0">
              <h1 class="text-xl font-bold">{activeChapter.chapter_name}</h1>
              <h2 class=" text-m">{activeChapter.chapter_description}</h2>
            </div>
            <div class="mt-8 flex flex-row justify-around">
              {#each activeChapter.topics as t}
                <Outcomes { supabase} {t} {addOutcomesToProfile} {session} {outcomes}/>
              {/each}
            </div>
          {/if}
        </div>
      {/key}
    </div>
  {/key}
{/if}
