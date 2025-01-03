<script lang="ts">
  export let onDelete: () => void;

  let showMenu = false;

  function toggleMenu() {
    showMenu = !showMenu;
  }
</script>

<div class="absolute right-0 top-1 mr-4">
  <button class="btn btn-ghost py-0 max-h-2 text-sm" on:click={toggleMenu}>
    ...
  </button>
  {#if showMenu}
    <div
      class="absolute bg-white border rounded-md shadow-md mt-2 w-32 right-0"
    >
      <button
        class="block w-full px-4 py-2 text-left hover:bg-gray-100"
        on:click={() => {
          onDelete();
          showMenu = false;
        }}
      >
        Delete Flashcard
      </button>
    </div>
  {/if}
</div>
