<script lang="ts">
  export let chapters: string[];
  export let selectedChapters: string[] = [];

  function toggleChapter(chapter: string) {
    selectedChapters = selectedChapters.includes(chapter)
      ? selectedChapters.filter((c) => c !== chapter)
      : [...selectedChapters, chapter];
  }
</script>

<h3 class="text-lg font-bold mb-2">Select Chapters</h3>

<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
  {#each chapters as chapter}
    <label class="flex items-center space-x-2">
      <input type="checkbox" value={chapter} bind:group={selectedChapters} />
      <span>{chapter}</span>
    </label>
  {/each}
</div>
