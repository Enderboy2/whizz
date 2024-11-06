<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onDestroy } from "svelte";
  import Syllabus from "./Syllabus.svelte";
  import Search from "./Search.svelte";

  export let data;
  let { supabase, session } = data;
  $: ({ supabase, session } = data);
  $: email = $page.params.email;
  export let profile;
  export let saveProfile;
  let syllabuses: any[] = [];
  let activeSyllabus: any = null;
  let isSearch = false;

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

  const toggleSearch = () => {
    isSearch = !isSearch;
  };

  $: if (profile?.syllabus_ids) {
    fetchSyllabuses();
  }
</script>

{#if syllabuses.length > 0}
  {#if activeSyllabus}
    <Syllabus {activeSyllabus} {data} />
    <button
      class="btn fixed top-20 left-2 bg-white border-2 text-center
      "
      on:click={() => (activeSyllabus = undefined)}>⬅</button
    >
  {:else if isSearch}
    <div class="w-auto h-auto flex flex-col justify-center items-center mt-24">
      <Search {profile} {saveProfile} {data} />
    </div>
    <button
      class="btn fixed top-20 left-2 bg-white border-2 text-center"
      on:click={() => toggleSearch()}>⬅</button
    >
  {:else}
    <div
      class="h-full max-w-screen min-w-fit items-center justify-center flex flex-col text-center min-h-fit mx-4"
    >
      <h1 class="mb-6 font-bold text-xl">What do you want to study?</h1>
      <div class=" flex flex-col gap-4">
        {#each syllabuses as s}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class=" p-6 card-hover flex flex-row justify-between items-center cursor-pointer bg-white border-2 rounded-md border-gray-300 min-w-fit max-w-full"
            on:click={() => (activeSyllabus = s)}
          >
            <h1 class="font-bold text-3xl">{s.syllabus_name}</h1>
            <div class=" ml-6">
              <h2 class="badge bg-black text-white rounded-md">
                {s.syllabus_level}
              </h2>
              <h2 class="badge bg-black text-white rounded-md ml-2">
                {s.syllabus_code}
              </h2>
            </div>
          </div>
        {/each}
      </div>
      <button class="btn bg-black text-white mt-4" on:click={() => toggleSearch()}
        >add another syllabus</button
      >
    </div>
  {/if}
{/if}
