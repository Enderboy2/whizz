<script lang="ts">
  export let c;
  export let data;

  let { supabase, session } = data;
  $: ({ supabase, session } = data);

  let topics: any[] = [];
  let isOpen = false;
  let isLoading = false;

  // Fetch topics immediately on render
  const fetchTopics = async () => {
    isLoading = true;
    if (c && c.chapter_id && !topics.length) {
      const { data, error } = await supabase
        .from("topics")
        .select()
        .eq("chapter_id", c.chapter_id);
      if (error) {
        console.error(error);
        return null;
      }
      topics = data;
    }
    isLoading = false;
  };

  // Handle toggle open/close
  const toggleOpen = () => {
    isOpen = !isOpen;
  };
  $: if (topics.length === 0) {
    fetchTopics();
  }
</script>

<div
  class="cursor-pointer border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
  rounded-md p-4 transition-transform duration-500 ease-in-out shadow-sm lg:hover:scale-105
  max-w-full mx-4 max-h-fit"
  on:click={toggleOpen}
>
  <div class="flex justify-between items-center">
    <h1 class="font-bold text-lg text-black dark:text-white">
      {c.chapter_number}. {c.chapter_name}
    </h1>
    <div class="text-gray-600 dark:text-gray-300 text-sm">
      {topics.length} Topics
    </div>
  </div>

  <!-- Smooth opening and closing of the chapter content using max-height -->
  <div
    class={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? "max-h-[1000px]" : "max-h-0"}`}
  >
    <div class="mt-2">
      <!-- Placeholder while loading -->
      {#if isLoading}
        <div class="text-center p-4 text-gray-500 dark:text-gray-300">
          Loading topics...
        </div>
      {/if}

      <!-- Topics are rendered once fetched -->
      {#if !isLoading && topics.length > 0}
        {#each topics as t}
          <a
            href={`/topic/${t.topic_id}`}
            class="bg-gray-100 dark:bg-gray-700 text-black dark:text-white rounded-md m-1 py-2 px-3 font-semibold block hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t.topic_name}
          </a>
        {/each}
      {/if}

      <!-- No topics case -->
      {#if !isLoading && topics.length === 0}
        <div class="text-center p-4 text-gray-500 dark:text-gray-300">
          No topics available for this chapter.
        </div>
      {/if}
    </div>
  </div>
</div>
