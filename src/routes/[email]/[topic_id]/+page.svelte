<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import type { PageLoad } from "./$types";
  import type { SupabaseClient } from "@supabase/supabase-js";
  import { goto } from "$app/navigation";
  import { marked } from "marked";
  import { VITE_GOOGLE_GENERATIVE_API_KEY } from "$env/static/private";
  const apiKey = VITE_GOOGLE_GENERATIVE_API_KEY;

  interface Outcome {
    id: number;
    outcome_name: string;
    completed: boolean; // Keep track of completion locally for UI
    explanation: string;
  }

  export const load: PageLoad = async ({ data }: { data: any }) => {
    const { supabase, session } = data;
    return { supabase, session };
  };

  let outcomes: Outcome[] = [];
  let isLoading = true;
  let topic_id: string;
  let topic_name = "";
  let supabase: SupabaseClient;
  let userEmail: string;
  let showExplanation: boolean = false;
  let showButton: boolean = false;
  let heldOutcome: number | null = null;
  let currentOutcome: number | null = null;
  $: topic_id = $page.params.topic_id;

  import { GoogleGenerativeAI } from "@google/generative-ai";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  let txt: any = "";

  const hadBadFinishReason = (candidate: any) => {
    // You can define what constitutes a "bad finish reason" based on your API's response structure.
    return (
      candidate.finishReason === "ERROR" ||
      candidate.finishReason === "TOO_LONG"
    );
  };

  const explain = async (outcomeName: string) => {
    try {
      console.log("Started generating...");

      const result = await model.generateContent(
        `Please provide a JSON structure for the following IGCSE learning outcome:` +
          outcomeName +
          `
You need to create a JSON file with the following fields only:

title: The title of the learning outcome.
explanation: A concise so extremly detailed explanation of the learning outcome. Use Markdown syntax for the explanation section only (e.g., headers, lists, bold, etc.).
study_methods:
higher_order: List study methods that involve critical thinking, analysis, or application.
lower_order: List study methods that focus on memorization, understanding facts, or basic concepts.
difficulty: Specify the difficulty level of the learning outcome (e.g., "Easy," "Intermediate," "Hard").
estimated_study_time: Approximate time in minutes or hours needed to study the outcome (e.g., "30 minutes," "1 hour").
dig_deeper: A list of additional resources (e.g., videos, articles) for students who want to explore the topic further. Each resource should include:
type: The type of resource (e.g., "Video," "Document").
link: The URL to the resource.
description: A short description of what the resource offers.
Structure Example:
{
  "title": "Topic Title",
  "explanation": "A clear explanation using *Markdown* syntax.",
  "study_methods": {
    "higher_order": ["Method 1", "Method 2"],
    "lower_order": ["Method 1", "Method 2"]
  },
  "difficulty": "Intermediate",
  "estimated_study_time": "30 minutes",
  "dig_deeper": [
    {
      "type": "Video",
      "link": "https://example.com/video",
      "description": "A helpful video explaining the concept."
    },
    {
      "type": "Document",
      "link": "https://example.com/document",
      "description": "In-depth reading on the topic."
    }
  ]
}
Additional Notes:
Only include the fields specified above—no additional data or sections.
Ensure that Markdown syntax is applied only to the explanation field, and everything else is provided as plain text.
Stick to this exact structure every time to avoid any inconsistencies.
Return only the JSON file—no additional files or content.not in a codeblock, just raw text this is very IMPORTANT!!!
dont include a general title in the explanation as you already give it in the title part and if you include one make sure that it not the same as the main title and make sure is not a h1
again just raw text this is very IMPORTANT!!!`
      );

      // Ensure the response contains candidates
      if (
        result?.response?.candidates &&
        result.response.candidates.length > 0
      ) {
        const firstCandidate = result.response.candidates[0];

        // Optionally handle multiple candidates or any finish issues
        if (result.response.candidates.length > 1) {
          console.warn(`Multiple candidates returned. Using the first one.`);
        }

        if (hadBadFinishReason(firstCandidate)) {
          throw new Error("Bad finish reason encountered.");
        }

        console.log(
          "Generated text: ",
          firstCandidate.content.parts[0].text || ""
        );
        try {
          txt = JSON.parse(firstCandidate.content.parts[0].text || "");
        } catch (error) {
          console.error("Error parsing JSON:", error);
          txt = {
            explanation:
              "Sorry, an error occurred while generating the explanation, try again.",
          };
        }
        // Safely retrieve the text as
      } else {
        throw new Error("No candidates found in response.");
      }
    } catch (error) {
      console.error("Error while generating content:", error);
      txt = {
        explanation:
          "Sorry, an error occurred while generating the explanation, try again.",
      };
    }
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
  <div
    class="p-4 flex items-center fixed bg-white border-2 rounded-sm ml-2 z-10"
  >
    <button
      on:click={goBackToSyllabus}
      class="btn font-bold py-2 px-4 border-none bg-white"
    >
      ⬅
    </button>
    <h1 class="text-2xl font-bold ml-3 text-left text-blackz-10">
      {topic_name || "Loading..."}
    </h1>
  </div>

  <div class="p-2">
    {#if isLoading}
      <div class="text-center p-4 text-gray-500">Loading outcomes...</div>
    {/if}

    {#if !isLoading && outcomes.length > 0}
      <ul class="space-y-4 mt-20 p-4 overflow-scroll z-1 px-0">
        {#each outcomes as outcome}
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <li
            class="flex flex-col space-x-3 p-2 transition-transform duration-200 ease-in-out lg:hover:bg-gray-100 lg:hover:scale[101] z-1"
          >
            {#if showExplanation && currentOutcome == outcome.id}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="flex flex-col items-baseline space-x-3 card bg-white p-2 w-full max-w-none text-wrap"
                on:mouseenter={() => {
                  showButton = true;
                  heldOutcome = outcome.id;
                }}
                on:mouseleave={() => {
                  showButton = false;
                  heldOutcome = null;
                }}
              >
                {#if outcome.explanation == ""}
                  {#key txt}
                    {#if txt == ""}
                      <p>Generating from ai...</p>
                    {:else}
                      <div class="prose prose-indigo p-2 w-full max-w-none">
                        <h1 class="text-4xl font-bold mb-1">{txt.title}</h1>
                        <div
                          class="flex flex-row text-sm h-6 items-baseline mb-0"
                        >
                          <h2
                            class="badge variant-filled max-h-fit p-2 text-white m-0 text-sm"
                          >
                            {txt.difficulty || ""}
                          </h2>
                        </div>
                        {@html marked(txt.explanation, { breaks: true })}
                        <hr class="my-2" />
                        {#if txt.study_methods}
                          {#if txt.study_methods.higher_order && txt.study_methods.lower_order}
                            <div class="flex flex-col">
                              <h1 class="text-3xl font-bold my-0 mb-2">
                                Study Methods 😉
                              </h1>
                              {#if txt.study_methods.higher_order.length > 0}
                                <h2 class="text-2xl font-semibold my-0 ml-2">
                                  Higher Order
                                </h2>
                                <ul class="ml-2">
                                  {#each txt.study_methods?.higher_order as method}
                                    <li class="list-disc">{method}</li>
                                  {/each}
                                </ul>
                              {/if}
                              {#if txt.study_methods.lower_order.length > 0}
                                <h2 class="text-2xl font-semibold my-0 ml-2">
                                  Lower Order
                                </h2>
                                <ul class="ml-2">
                                  {#each txt.study_methods?.lower_order as method}
                                    <li class="list-disc">{method}</li>
                                  {/each}
                                </ul>
                              {/if}
                            </div>
                          {/if}
                        {/if}
                      </div>
                    {/if}
                  {/key}
                {:else}
                  <p>ready explanation for {outcome.explanation}</p>
                {/if}

                {#if showButton && heldOutcome == outcome.id}
                  <button
                    class="btn absolute bottom-2 right-2 btn-primary opacity-75"
                    on:click={() => {
                      showExplanation = false;
                      currentOutcome = outcome.id;
                      txt = "";
                    }}
                    >go back
                  </button>
                {/if}
              </div>
            {:else}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="flex items-baseline space-x-3 relative h-full min-h-20 z-1"
                on:mouseenter={() => {
                  showButton = true;
                  heldOutcome = outcome.id;
                }}
                on:mouseleave={() => {
                  showButton = false;
                  heldOutcome = null;
                }}
              >
                <input
                  type="checkbox"
                  id={`outcome-${outcome.id}`}
                  class="form-checkbox z-1"
                  checked={outcome.completed}
                  on:change={() => toggleCheckbox(outcome)}
                />
                <label
                  for={`outcome-${outcome.id}`}
                  class="text-lg font-semibold h-full z-1"
                >
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
                {#if showButton && heldOutcome == outcome.id}
                  <button
                    class="btn btn-primary absolute bottom-2 right-2 opacity-75"
                    on:click={() => {
                      showExplanation = true;
                      currentOutcome = outcome.id;
                      txt = "";
                      explain(outcome.outcome_name);
                    }}
                    >Explain
                  </button>
                {/if}
              </div>
            {/if}
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
