<script lang="ts">
  import type { SubmitFunction } from "@sveltejs/kit";
  import type { SupabaseClient } from "@supabase/supabase-js";

  export let data: {
    session: any;
    supabase: SupabaseClient;
    profile: {
      id: number;
      username: string;
      selected: string;
      outcomes: string; 
    };
  };

  let { session, supabase, profile } = data;
  let loading = true;

  let username = "user";
  let syllabus_ids: number[] = [];
  let active_syllabus: string | number;
  let outcomes ="";

  $: if (profile && profile.username) {
    console.log("Profile is available", profile);
    syllabus_ids = profile.selected?.split(",").map((id: string) => parseInt(id, 10)) ?? [];
    active_syllabus = syllabus_ids[0];
    outcomes = profile.outcomes ?? "";
    
    if (syllabus_ids.length > 0) {
      fetchData(active_syllabus).then(() => {
        loading = false;
      });
    } else {
      loading = false;
    }
  } else {
    console.log("still loading");
  }

  let showSearch = false;

  const handleSignOut: SubmitFunction = () => {
    loading = true;
    return async ({ update }) => {
      loading = false;
      update();
    };
  };

  const syllabusIsSelected = (syllabusId: number) => {
    return syllabus_ids.includes(syllabusId);
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
      if (!syllabus_ids.includes(syllabusId)) {
        syllabus_ids.push(syllabusId);
      } else {
        console.log(`Syllabus ${syllabusId} is already selected, nothing added`);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ active_syllabus: syllabus_ids.join(",") })
        .eq("id", session.user.id);

      if (error) {
        console.error("Error updating profile:", error.message);
        return;
      }

      profile.selected = syllabus_ids.join(",");
    } catch (error) {
      console.error("Error adding to profile:", error);
    }
  };

  const toggleSearch = () => {
    showSearch = !showSearch;
  };

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

</script>

{#if !loading}
  <h1>Finished loading</h1>
{:else}
  <h1>Still loading</h1>
{/if}
