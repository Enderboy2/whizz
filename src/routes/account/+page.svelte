<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import Search from "./Search.svelte";
  import type { SupabaseClient } from "@supabase/supabase-js";
  import { createEventDispatcher } from "svelte";
  import { onMount } from "svelte";
  import Navbar from "./Navbar.svelte";
  import Content from "./Content.svelte";

  export let data: {
    session: any;
    supabase: SupabaseClient;
    profile: {
      id: number;
      username: string;
      selected_syllabus: string;
      outcomes: string; // Assuming selected_syllabus is stored as comma-separated IDs
    };
  };

  let { session, supabase, profile } = data;
  let loading = false;
  let username = profile?.username ?? "";
  let selected_syllabus = profile?.selected_syllabus ?? "";
  let outcomes = profile?.outcomes ?? "";
  let showSearch = false;
  const dispatch = createEventDispatcher();

  const handleSignOut: SubmitFunction = () => {
    loading = true;
    return async ({ update }) => {
      loading = false;
      update();
    };
  };

  const syllabusIsSelected = (syllabusId: number) => {
    if (!selected_syllabus || selected_syllabus === "NULL") return false;
    const selectedIds = selected_syllabus.split(",");
    return selectedIds.includes(syllabusId.toString());
  };

  const addOutcomesToProfile = async (outcomes_string: any) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ outcomes: outcomes_string })
        .eq("id", session.user.id);
      if (error) {
        console.error("Error updating profile:", error.message);
        return;
      }
      profile.outcomes = outcomes_string;
    } catch (error) {
      console.error("Error adding to profile:", error);
    }
  };

  const addToProfile = async (syllabusId: number) => {
    try {
      let updatedSyllabusIds = "";

      if (!selected_syllabus || selected_syllabus === "NULL") {
        updatedSyllabusIds = syllabusId.toString();
      } else {
        const selectedIds = selected_syllabus.split(",");
        if (!selectedIds.includes(syllabusId.toString())) {
          updatedSyllabusIds = `${selected_syllabus},${syllabusId}`;
        } else {
          console.log(
            `Syllabus ${syllabusId} is already selected, nothing added`
          );
          return;
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ selected_syllabus: updatedSyllabusIds })
        .eq("id", session.user.id);

      if (error) {
        console.error("Error updating profile:", error.message);
        return;
      }

      selected_syllabus = updatedSyllabusIds;
      profile.selected_syllabus = updatedSyllabusIds;
    } catch (error) {
      console.error("Error adding to profile:", error);
    }
  };

  const toggleSearch = () => {
    showSearch = !showSearch;
  };

  $: syllabus_ids = profile.selected_syllabus
    .split(",")
    .map((id: string) => parseInt(id, 10));
  $: active_syllabus = syllabus_ids[0];
  $: outcomes = profile.outcomes;
  $: console.log("done outcmes -> ", outcomes)
  const switchActiveSyllabus = (id: number) => {
    active_syllabus = id;
  };

  let syllabusData: any;

  const build = async (id: any) => {
    console.log("building syllabus data...");
    try {
      const { data, error } = await supabase
        .from("syllabus")
        .select("*")
        .in("syllabus_id", id);

      if (error) {
        console.error("Supabase search error:", error.message);
        return [];
      }

      (data as any).syllabusChapters = await supabase
        .from("chapters")
        .select("*")
        .in("syllabus_id", id);

      return data;
    } catch (error: any) {
      console.error("building failed:", error.message);
      return [];
    }
  };

  // Fetch data and assign to syllabusData
  const fetchData = async (id: any) => {
    try {
      console.log("active syllabus:", id);
      syllabusData = await build([id]);
      console.log(syllabusData); // Logs the resolved value of the promise
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Call fetchData to populate syllabusData
  $: if (!selected_syllabus || selected_syllabus === "NULL") {
    console.log("Empty sidebar");
  } else {
    fetchData(active_syllabus);
  }
</script>

{#key selected_syllabus}
  <Navbar
    {supabase}
    {selected_syllabus}
    {switchActiveSyllabus}
    {handleSignOut}
    {toggleSearch}
  />
{/key}

{#if !selected_syllabus || selected_syllabus === "NULL"}
  <div class="font-space text-white bg-gray-800 min-h-screen w-full p-8">
    <h1 class="text-3xl font-bold mb-4">Hi {username}, Welcome to Whizz!</h1>
    <h2 class="text-xl mb-6">
      I see you haven't selected your subjects yet, maybe try the search bar
    </h2>
  </div>
{:else if syllabusData}
  {#key syllabusData && outcomes}
    <Content {syllabusData} {supabase}  {addOutcomesToProfile} {session} {outcomes}/>
  {/key}
{/if}

<!-- Search button at the bottom right corner -->

{#if showSearch}
  <div
    class="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 p-4 rounded shadow-lg z-50"
  >
    <Search {syllabusIsSelected} {addToProfile} {supabase} />
  </div>
{/if}
