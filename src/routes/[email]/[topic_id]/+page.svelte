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
  }

  let outcomes: Outcome[] = [];
  let isLoading = true;
  let topic_id: string;
  let topic_name = "";
  let supabase: SupabaseClient;
  let userEmail: string;
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
    isLoading = false;
  };

  const fetchTopicName = async () => {
    const { data, error } = await supabase
      .from("topics")
      .select("topic_name")
      .eq("topic_id", topic_id)
      .single();

    if (error) {
      console.error(error);
      topic_name = "Error loading topic name";
    } else {
      topic_name = data.topic_name;
    }
  };

  onMount(async () => {
    const { supabase: client, session } = await load({ data: $page.data });
    supabase = client;
    userEmail = session.user.email;

    await Promise.all([fetchOutcomes(), fetchTopicName(), fetchUserProgress()]);
    isLoading = false;
    console.log(outcomes);
  });
</script>

{#if isLoading}
  <div class=""></div>
{:else}
  <div
    class="flex flex-col mt-16 min-h-screen !text-black !bg-white mx-4 gap-4"
  >
    <h1 class="text-3xl font-bold text-center mt-2">{topic_name}</h1>
    {#key outcomes}
      {#each outcomes as outcome}
        {#key outcome.completed}
          <Outcome {outcome} />
        {/key}
      {/each}
    {/key}
  </div>
{/if}
