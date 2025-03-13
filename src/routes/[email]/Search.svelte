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
  let buttonState: string;
  const fetchSyllabuses = async () => {
    syllabuses = await supabase.from("syllabus").select();
    syllabuses = syllabuses.data;
  };
  $: fetchSyllabuses();
  $: if (syllabuses && syllabuses[0]) {
    console.log(syllabuses[0]);
    console.log(profile.username);
  }

  // Initialize buttonState based on the first syllabus
  $: if (syllabuses && syllabuses.length > 0) {
    buttonState = profile.syllabus_ids.includes(syllabuses[0].syllabus_id)
      ? "Remove"
      : "Add";
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
        <div
          class="card p-2 mb-1 pb-6 rounded-md !bg-white !text-black border-2 border-gray-300 min-w-fit max-w-none"
        >
          <header
            class="card-header flex justify-between items-center min-w-fit max-w-none"
          >
            <div class="flex items-center gap-2 mr-4">
              <h1 class="text-3xl font-bold sm:max-w-40 min-w-fit">
                {s.syllabus_name}
              </h1>
              <div class="flex gap-2 items-center mt-2">
                <span class="badge bg-black text-white rounded-md"
                  >{s.syllabus_code}</span
                >
                <span class="badge bg-black text-white rounded-md"
                  >{s.syllabus_level}</span
                >
                <span class="badge bg-black text-white rounded-md"
                  >{s.syllabus_board}</span
                >
              </div>
            </div>
            {#if s.status === false}
              <h1 class="badge bg-green-200 text-black border-none">
                Coming Soon
              </h1>
            {:else}
              <button
                class="btn btn-primary rounded-md"
                on:click={async () => {
                  if (profile.syllabus_ids.includes(s.syllabus_id)) {
                    profile.syllabus_ids = profile.syllabus_ids.filter(
                      (id) => id !== s.syllabus_id
                    );
                    console.log("removed syllabus");
                  } else {
                    profile.syllabus_ids.push(s.syllabus_id);
                    console.log("added syllabus");
                  }
                  // Update the button state without refreshing the page
                  buttonState = profile.syllabus_ids.includes(s.syllabus_id)
                    ? "Remove"
                    : "Add"; // Update buttonState directly
                  await saveProfile(profile);
                  invalidateAll();
                }}
                >{profile.syllabus_ids.includes(s.syllabus_id)
                  ? "Remove"
                  : "Add"}</button
              >
            {/if}
          </header>
        </div>
      {/if}
    {/each}
  </div>
{/if}
