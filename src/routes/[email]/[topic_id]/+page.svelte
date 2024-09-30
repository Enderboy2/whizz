<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import type { PageLoad } from "./$types";
  import type { SupabaseClient } from "@supabase/supabase-js";
  import { goto } from "$app/navigation";

  interface Outcome {
    id: number;
    outcome_name: string;
    completed: boolean; // Keep track of completion locally for UI
  }

  export const load: PageLoad = async ({ data }) => {
    const { supabase, session } = data;
    return { supabase, session };
  };

  let outcomes: Outcome[] = [];
  let isLoading = true;
  let topic_id: string;
  let topic_name = "";
  let supabase: SupabaseClient;
  let userEmail: string;

  $: topic_id = $page.params.topic_id;

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
    });
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

    await Promise.all([fetchOutcomes(), fetchTopicName()]);
  });

  const toggleCheckbox = async (outcome: Outcome) => {
    outcome.completed = !outcome.completed;

    if (outcome.completed) {
      // Create a new progress entry
      const { error } = await supabase
        .from("user_progress")
        .insert([{ outcome_id: outcome.id, user_email: userEmail }]);

      if (error) {
        console.error(error);
        outcome.completed = false; // Revert on error
      }
    } else {
      // Remove the progress entry
      const { error } = await supabase
        .from("user_progress")
        .delete()
        .eq("outcome_id", outcome.id)
        .eq("user_email", userEmail);

      if (error) {
        console.error(error);
        outcome.completed = true; // Revert on error
      }
    }
  };

  const goBackToSyllabus = () => {
    goto(`/${userEmail}`);
  };

  const formatOutcomeName = (outcome_name: string) => {
    const actionWords = [
      "describe",
      "explain",
      "outline",
      "state",
      "compare",
      "recognise",
      "relate",
      "make",
      "draw",
      "calculate",
      "use",
      "define",
      "investigate",
      "illustrate",
      "interpret",
      "discuss",
    ];
    const colonIndex = outcome_name.indexOf(":");
    let formattedTitle = outcome_name;

    if (colonIndex !== -1) {
      const mainTitle = outcome_name.slice(0, colonIndex + 1).trim();
      const bulletPoints = outcome_name
        .slice(colonIndex + 1)
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      formattedTitle = mainTitle
        .split(" ")
        .map((word) => {
          return actionWords.includes(word.toLowerCase())
            ? `<span class="text-blue-600 font-bold text-xl">${word}</span>`
            : word;
        })
        .join(" ");

      return {
        mainTitle: formattedTitle,
        bulletPoints,
      };
    } else {
      formattedTitle = outcome_name
        .split(" ")
        .map((word) => {
          return actionWords.includes(word.toLowerCase())
            ? `<span class="text-blue-600  font-bold text-xl">${word}</span>`
            : word;
        })
        .join(" ");

      return { mainTitle: formattedTitle, bulletPoints: [] };
    }
  };

  const hasBulletPoints = (outcome_name: string) => {
    return outcome_name.includes(":");
  };
</script>

<div class="flex flex-col mt-16 min-h-screen text-black">
  <div class="p-4 flex items-center fixed bg-white border-2 rounded-sm ml-2">
    <button
      on:click={goBackToSyllabus}
      class="btn font-bold py-2 px-4 border-none bg-white"
    >
      ⬅
    </button>
    <h1 class="text-2xl font-bold ml-3 text-left text-black">
      {topic_name || "Loading..."}
    </h1>
  </div>

  <div class="p-6">
    {#if isLoading}
      <div class="text-center p-4 text-gray-500">Loading outcomes...</div>
    {/if}

    {#if !isLoading && outcomes.length > 0}
      <ul class="space-y-4 mt-28">
        {#each outcomes as outcome}
          <li
            class="flex items-baseline space-x-3 p-2 rounded-md transition-transform duration-200 ease-in-out lg:hover:bg-gray-100 lg:hover:scale-105"
          >
            <input
              type="checkbox"
              id={`outcome-${outcome.id}`}
              class="form-checkbox"
              checked={outcome.completed}
              on:change={() => toggleCheckbox(outcome)}
            />
            <label for={`outcome-${outcome.id}`} class="text-lg font-semibold">
              {#if hasBulletPoints(outcome.outcome_name)}
                {@html formatOutcomeName(outcome.outcome_name).mainTitle}
                <ul class="list-disc ml-4 text-gray-800">
                  {#each formatOutcomeName(outcome.outcome_name).bulletPoints as point}
                    <p>{@html point}</p>
                  {/each}
                </ul>
              {:else}
                <span class="font-semibold">
                  {@html formatOutcomeName(outcome.outcome_name).mainTitle}
                </span>
              {/if}
            </label>
          </li>
        {/each}
      </ul>
    {/if}

    {#if !isLoading && outcomes.length === 0}
      <div class="text-center p-4 text-gray-500">
        No outcomes available for this topic.
      </div>
    {/if}
  </div>
</div>
