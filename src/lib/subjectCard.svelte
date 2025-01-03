<script lang="ts">
  export let subject: { name: string; chapters: string[] };
</script>

<div
  class="card cursor-pointer p-6 shadow-lg rounded-lg hover:bg-gray-100"
  on:click
>
  <h2 class="text-xl font-semibold">{subject.name}</h2>
</div>
