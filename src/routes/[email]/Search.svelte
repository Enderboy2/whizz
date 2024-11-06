<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/stores";

  export let profile;
  export let saveProfile;
  export let data;
  let { supabase, session } = data;
  $: ({ supabase, session } = data);
  $: email = $page.params.email;
  let syllabuses: any;
  let search: string = "";
  const fetchSyllabuses = async () => {
    syllabuses = await supabase.from("syllabus").select();
    syllabuses = syllabuses.data;
  };
  $: fetchSyllabuses();
  $: if (syllabuses && syllabuses[0]) {
    console.log(syllabuses[0]);
    console.log(profile.username);
  }
</script>

{#if syllabuses && syllabuses[0] && profile && profile.syllabus_ids}
  <div class="h-auto overflow-y-scroll flex flex-col max-w-screen min-w-fit">
    <input
      bind:value={search}
      class="!bg-white !text-black input mb-3 rounded-md border-primary border-2 text-lg font-semibold"
      placeholder="Search for a syllabus..."
    />
    {#each syllabuses as s}
      {#if s.syllabus_name
        .toLowerCase()
        .includes(search) || s.syllabus_name.includes(search)}
        <div class="card p-2 mb-1 pb-6 rounded-md !bg-white !text-black border-2 border-gray-300">
          <header class="card-header flex justify-between items-center">
            <div class="">
              <h1 class="text-3xl font-bold max-w-40">{s.syllabus_name}</h1>
              <div class="flex gap-2 items-center mt-2">
                <span class="badge bg-black text-white rounded-md">{s.syllabus_code}</span>
                <span class="badge bg-black text-white rounded-md">{s.syllabus_level}</span>
                <span class="badge bg-black text-white rounded-md">{s.syllabus_board}</span>
              </div>
            </div>
            {#if s.status === false}
              <h1 class="badge bg-green-200 text-black border-none ">Coming Soon</h1>
            {:else}
              <button
                class="btn btn-primary rounded-md"
                on:click={async () => {
                  if (profile.syllabus_ids.includes(s.syllabus_id)) {
                    console.log("already added");
                  } else {
                    profile.syllabus_ids.push(s.syllabus_id);
                    await saveProfile(profile);
                    console.log(typeof profile.syllabus_ids);
                    invalidateAll();
                  }
                }}
                >+
              </button>
            {/if}
          </header>
        </div>
      {/if}
    {/each}
  </div>
{/if}
