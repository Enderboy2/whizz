<script>
  export let data;
  import "../styles.css";
  import { goto, invalidateAll } from "$app/navigation";
  import { LightSwitch } from "@skeletonlabs/skeleton";
  import { onMount } from "svelte";
  import { autoModeWatcher } from "@skeletonlabs/skeleton";
  import { initializeStores, Drawer } from "@skeletonlabs/skeleton";

  onMount(() => {
    autoModeWatcher();
  });

  let { supabase, session } = data;
  $: ({ supabase, session } = data);

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN") {
      invalidateAll();
    }

    if (event === "SIGNED_OUT") {
      await goto("login");
      invalidateAll();
    }
  });

  initializeStores();
</script>

<Drawer />

<!-- Navbar -->
<div class="bg-white justify-between fixed top-0 left-0 right-0 z-10">
  <div class="navbar max-w-3xl mx-auto justify-between">
    <!-- Left side of navbar -->
    <div>
      <a href="/" class="btn btn-ghost text-xl font-bold">Whizz!</a>
      <h1 class="badge p-1 ml-2 text-black bg-green-200 border-white">
        Experimental
      </h1>
    </div>
    <!-- Right side of navbar -->
    <div>
      {#if session == null}
        <button
          on:click={() => goto("/login")}
          class="btn btn-ghost font-semibold mr-2">Login</button
        >
      {:else}
        <button
          class="btn bg-white border-none"
          on:click={() => goto("/flashcards")}>🃏</button
        >
        <button
          class="btn bg-white border-none"
          on:click={() => goto("/past_papers")}>📄</button
        >
        <button
          class="ml-2 btn btn-ghost"
          on:click={async () => {
            await supabase.auth.signOut();
          }}>Logout</button
        >
      {/if}
    </div>
  </div>
</div>
<div class="min-h-screen h-fit w-screen pt-16 overflow-scroll">
  <slot class="bg-white"></slot>
</div>
