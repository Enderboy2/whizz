<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onDestroy } from "svelte";
  import Syllabus from "./Syllabus.svelte";

  export let data;
  let { supabase, session } = data;
  $: ({ supabase, session } = data);
  $: email = $page.params.email;
  export let profile;
  export let saveProfile;
  let syllabuses: any[] = [];
  let activeSyllabus: any = null;

  const fetchSyllabuses = async () => {
    if (profile.syllabus_ids && profile.syllabus_ids.length > 0) {
      const fetchPromises = profile.syllabus_ids.map(async (id: number) => {
        console.log(id);
        let { data, error } = await supabase
          .from("syllabus")
          .select()
          .eq("syllabus_id", id);
        if (error) {
          console.error(error);
          return null;
        }
        return data;
      });

      const results = await Promise.all(fetchPromises);
      syllabuses = results.flat().filter((item: any) => item !== null);
      console.log(syllabuses);
    }
  };

  $: if (profile?.syllabus_ids) {
    fetchSyllabuses();
  }
</script>

{#if syllabuses.length > 0}
  {#if activeSyllabus}
    <Syllabus {activeSyllabus} {data} />
    <button
      class="btn fixed top-20 left-2"
      on:click={() => (activeSyllabus = undefined)}>⬅</button
    >
  {:else}
    <div
      class="h-full w-screen items-center justify-center flex flex-col text-center min-h-fit"
    >
      <h1 class="mb-6 font-bold text-xl">What do you want to study?</h1>
      {#each syllabuses as s}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="card p-6 card-hover flex flex-row justify-between items-center cursor-pointer"
          on:click={() => (activeSyllabus = s)}
        >
          <h1 class="font-bold text-3xl">{s.syllabus_name}</h1>
          <h2 class="badge variant-outline ml-6">
            {s.syllabus_level}
          </h2>
          <h2 class="badge variant-outline-tertiary ml-2">
            {s.syllabus_code}
          </h2>
        </div>
      {/each}
    </div>
  {/if}
{/if}
