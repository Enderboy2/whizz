<script lang="ts">
  import Chapter from "./Chapter.svelte";
  export let activeSyllabus: any;
  export let data;
  let { supabase, session } = data;
  $: ({ supabase, session } = data);

  let chapters: any[] = [];

  const fetchChapters = async () => {
    if (activeSyllabus && activeSyllabus.syllabus_id) {
      const { data, error } = await supabase
        .from("chapters")
        .select()
        .eq("syllabus_id", activeSyllabus.syllabus_id);
      if (error) {
        console.error(error);
        return null;
      }
      return data;
    }
  };

  $: if (activeSyllabus.syllabus_id) {
    fetchChapters().then((results) => {
      if (results) chapters = results;
    });
  }
</script>

{#if activeSyllabus && chapters?.length !== 0}
  <div
    class="w-full flex flex-col justify-center items-center gap-6 px-4 lg:min-w-96 px-auto min-h-fit overflow-scroll pb-4 bg-white"
  >
    <h1 class="text-7xl font-bold text-center text-black">
      {activeSyllabus.syllabus_name}
    </h1>
    <div class="flex flex-row gap-3 justify-center mb-4">
      <h2 class="badge bg-black text-white rounded-md">
        {activeSyllabus.syllabus_level}
      </h2>
      <h2 class="badge bg-black text-white rounded-md">
        {activeSyllabus.syllabus_board}
      </h2>
      <h2 class="badge bg-black text-white rounded-md">
        {activeSyllabus.syllabus_code}
      </h2>
    </div>
    <div class="w-full">
      <div
        class="flex lg:flex-wrap flex-col lg:overflow-y-hidden lg:max-h-[70vh] gap-2 gap-x-0"
      >
        {#each chapters as c}
          <Chapter {c} {data} />
        {/each}
      </div>
    </div>
  </div>
{/if}
