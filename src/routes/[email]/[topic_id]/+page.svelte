<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import type { PageLoad } from "./$types";
  import type { SupabaseClient } from "@supabase/supabase-js";
  import Outcome from "$lib/outcome.svelte";

  interface Outcome {
    id: number;
    outcome_name: string;
    completed: boolean; // Keep track of completion locally for UI
    explanation: string;
    notes_examples: string;
    has_flashcards: boolean;
    outcome_number: number;
  }

  let outcomes: Outcome[] = [];
  let isLoading = true;
  let topic_id: string;
  let topic_name = "";
  let supabase: SupabaseClient;
  let userEmail: string;
  let chapter_id: number;
  let syllabus_id: number;
  let syllabus_name = "";
  let chapter_name = "";
  $: topic_id = $page.params.topic_id;

  export const load: PageLoad = async ({ data }: { data: any }) => {
    const { supabase, session } = data;
    return { supabase, session };
  };

  const fetchOutcomes = async () => {
    isLoading = true;

    const { data, error } = await supabase
      .from("outcomes")
      .select()
      .eq("topic_id", topic_id); // Ensure to filter by topic_id

    if (error) {
      console.error(error);
      outcomes = [];
    } else {
      outcomes = data.map((outcome) => ({
        ...outcome,
        completed: false, // Initialize completed status
      }));
      console.log(outcomes);
    }

    await fetchUserProgress();
    isLoading = false;
  };

  const fetchUserProgress = async () => {
    isLoading = true;
    const { data, error } = await supabase
      .from("user_progress")
      .select("outcome_id")
      .eq("user_email", userEmail);

    if (error) {
      console.error(error);
      return;
    }

    // Update outcomes with user's completed status
    const completedOutcomes = new Set(data.map((row) => row.outcome_id));
    outcomes.forEach((outcome) => {
      outcome.completed = completedOutcomes.has(outcome.id);
      console.log(outcome.completed);
    });
    outcomes.sort((a, b) => a.outcome_number - b.outcome_number);
    isLoading = false;
  };

  const fetchTopicName = async () => {
    const { data, error } = await supabase
      .from("topics")
      .select()
      .eq("topic_id", topic_id)
      .single();

    if (error) {
      console.error(error);
      topic_name = "Error loading topic name";
    } else {
      topic_name = data.topic_name;
      chapter_id = data.chapter_id;
      console.log(chapter_id);
    }
  };

  const fetchSyllabusId = async () => {
    console.log(typeof chapter_id);
    const { data, error } = await supabase
      .from("chapters")
      .select()
      .eq("chapter_id", chapter_id)
      .single();

    if (error) {
      console.error(error);
      topic_name = "Error loading topic name";
    } else {
      syllabus_id = data.syllabus_id;
      console.log(syllabus_id);
    }
  };

  const fetchSyllabusName = async () => {
    const { data, error } = await supabase
      .from("syllabus")
      .select()
      .eq("syllabus_id", syllabus_id)
      .single();

    if (error) {
      console.error(error);
      syllabus_name = "Error loading syllabus name";
    } else {
      syllabus_name = data.syllabus_name;
    }
  };

  const fetchChapterName = async () => {
    const { data, error } = await supabase
      .from("chapters")
      .select()
      .eq("chapter_id", chapter_id)
      .single();

    if (error) {
      console.error(error);
      chapter_name = "Error loading topic name";
    } else {
      chapter_name = data.chapter_name;
    }
  };

  onMount(async () => {
    const { supabase: client, session } = await load({ data: $page.data });
    supabase = client;
    userEmail = session.user.email;

    await Promise.all([fetchOutcomes(), fetchTopicName(), fetchUserProgress()]);
    await fetchChapterName();
    await fetchSyllabusId();
    await fetchSyllabusName();
    console.log("page.svelte -> ", syllabus_name);
    isLoading = false;
    console.log(outcomes);
  });
</script>

{#if isLoading || !syllabus_id || !chapter_id || !topic_id || !syllabus_name || !chapter_name || !topic_name}
  <div class=""></div>
{:else}
  <div
    class="flex flex-col mt-16 min-h-screen !text-black !bg-white mx-4 gap-4"
  >
    <h1 class="text-3xl font-bold text-center mt-2">{topic_name}</h1>
    {#key outcomes}
      {#each outcomes as outcome}
        {#key outcome.completed}
          <Outcome
            {topic_name}
            {syllabus_name}
            {chapter_name}
            {topic_id}
            {chapter_id}
            {syllabus_id}
            {outcome}
          />
        {/key}
      {/each}
    {/key}
  </div>
{/if}
