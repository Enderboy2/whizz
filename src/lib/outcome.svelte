<script lang="ts">
  interface Outcome {
    id: number;
    outcome_name: string;
    completed: boolean;
    explanation: string;
    notes_examples: string;
  }

  export let outcome: Outcome;
  let supabase: SupabaseClient;
  let userEmail: string;
  const apiKey = import.meta.env.VITE_GOOGLE_GENERATIVE_API_KEY;
  let flipDirection = 1;
  let startX = 0;
  let currentRotation = 0;
  let showFront = true;
  let flipping = false;
  let isLoading = true;

  function handleTouchStart(event: TouchEvent) {
    startX = event.touches[0].clientX;
  }

  function handleTouchEnd(event: TouchEvent) {
    const endX = event.changedTouches[0].clientX;
    const swipeDistance = endX - startX;

    if (Math.abs(swipeDistance) > 100) {
      flipDirection = swipeDistance > 0 ? 1 : -1;
      currentRotation += 180 * flipDirection;

      setTimeout(async () => {
        showFront = currentRotation % 360 === 0;
        if (!showFront && txt == "") {
          await explain(outcome.outcome_name, outcome.notes_examples);
        }
      }, 150);
    }
  }

  import { GoogleGenerativeAI } from "@google/generative-ai";
  import type SupabaseClient from "@supabase/supabase-js/dist/module/SupabaseClient";
  import type { PageLoad } from "./$types";
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

  const explain = async (outcomeName: string, notesExamples: string) => {
    try {
      console.log("Started generating...");

      const result = await model.generateContent(
        `Please provide a JSON structure for the following IGCSE learning outcome:` +
          '"' +
          outcomeName +
          '" ' +
          " here are some examples of notes for this outcome(may be empty): " +
          '"' +
          notesExamples +
          '"' +
          `
  You need to create a JSON file with the following fields only:
  
  title: The title of the learning outcome.
  explanation: A concise so extremly detailed explanation of the learning outcome and its notes,explaining the exmaples aswell. Use Markdown syntax for the explanation section only (e.g., headers, lists, bold, etc.).
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
  Return only the JSON file—no additional files or content. not in a codeblock, just raw text this is very IMPORTANT!!!
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

  import { marked } from "marked";
  import { onMount } from "svelte";
  import { page } from "$app/stores";

  const renderer = new marked.Renderer();
  renderer.heading = ({ depth, tokens }: { depth: number; tokens: any[] }) => {
    const text = tokens.map((token) => token.raw).join(""); // Combine tokens to get the raw heading text

    // Define Tailwind classes for each heading level
    const headingClasses: { [key: number]: string } = {
      1: "text-4xl font-bold mb-4 text-gray-900 mt-0",
      2: "text-3xl font-semibold mb-4 text-gray-800 mt-0",
      3: "text-2xl font-medium mb-3 text-gray-700 mt-0",
      4: "text-xl font-medium mb-2 text-gray-600 mt-0",
      5: "text-lg font-semibold mb-1 text-gray-500 mt-0",
      6: "text-base font-semibold text-gray-400 mt-0",
    };

    return `<h${depth} class="${headingClasses[depth] || "text-base font-semibold"}">${text}</h${depth}>`;
  };
  renderer.strong = ({ tokens }: { tokens: any[] }): string => {
    let explanationNumberColors = ["text-secondary", "text-primary"];
    let explanationNumberColor =
      explanationNumberColors[
        Math.floor(Math.random() * explanationNumberColors.length)
      ];
    console.log(explanationNumberColor);
    const text = tokens.map((token) => token.raw).join(""); // Extract the bold text from tokens
    return `<strong class="${explanationNumberColor} font-bold">${text}</strong>`;
  };

  let timer: string | number | NodeJS.Timeout | undefined;
  let delayTimeout: string | number | NodeJS.Timeout | undefined;
  let progress = 0;
  let isHolding = false;

  function longPress(
    node: HTMLDivElement,
    { duration = 300, callback }: { duration: number; callback: () => void }
  ) {
    const delay = 300; // 150ms delay

    const handleTouchStart = () => {
      // Start a delay timer before initiating the animation
      delayTimeout = setTimeout(() => {
        isHolding = true;
        progress = 0;

        // Animate progress after the delay
        timer = setInterval(() => {
          progress += 100 / (duration / 10);
          progress = Math.min(progress, 100);
          console.log(progress); // Update every 10ms
          if (progress >= 100) {
            clearInterval(timer);
            callback();
          }
        }, 10);

        // Add scaling effect after the delay
        node.style.transition = "transform 0.1s ease";
        node.style.transform = "scale(1.02)";
      }, delay);
    };

    const handleTouchEnd = () => {
      clearTimeout(delayTimeout); // Cancel the delay timer
      clearInterval(timer); // Cancel the progress timer
      progress = 0;
      isHolding = false;

      // Reset scaling effect
      node.style.transition = "transform 0.2s ease";
      node.style.transform = "scale(1)";
    };

    node.addEventListener("touchstart", handleTouchStart);
    node.addEventListener("touchend", handleTouchEnd);
    node.addEventListener("touchcancel", handleTouchEnd);

    return {
      destroy() {
        clearTimeout(delayTimeout);
        clearInterval(timer);
        node.removeEventListener("touchstart", handleTouchStart);
        node.removeEventListener("touchend", handleTouchEnd);
        node.removeEventListener("touchcancel", handleTouchEnd);
      },
    };
  }

  async function handleLongPress() {
    console.log(progress);
    if (progress == 100) {
      progress = 0;
    }
    console.log("Long press triggered!");
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
  }

  export const load: PageLoad = async ({ data }: { data: any }) => {
    const { supabase, session } = data;
    return { supabase, session };
  };

  onMount(async () => {
    const { supabase: client, session } = await load({ data: $page.data });
    supabase = client;
    userEmail = session.user.email;
    isLoading = false;
    console.log(outcome.completed);
  });

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
      "understand",
      "find",
      "solve",
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

{#if isLoading}
  <div class=""></div>
{:else}
  {#key outcome.outcome_name}
    <div
      class="card-container w-74 mx-4 p-1 long-press-target"
      on:touchstart={handleTouchStart}
      on:touchend={handleTouchEnd}
      use:longPress={{ duration: 1500, callback: handleLongPress }}
    >
      {#key progress}
        <div
          class="progress-bar rounded-md bg-green-500"
          style="width: {progress}%"
          aria-hidden="true"
        ></div>
      {/key}

      <div
        class={`card w-full h-auto relative !bg-white border-2 rounded-md overflow-hidden group 
    ${showFront ? "border-primary z-50" : "border-secondary"} ${outcome.completed ? "!border-green-500" : ""} transition-all`}
        style="transform: rotateY({currentRotation}deg);"
      >
        {#if showFront}
          <div class="card-side card-front p-4">
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label
              class="text-lg font-semibold text-black h-full z-1 text-left"
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
            <div
              class={`text-green-500 text-left w-full text-sm ${outcome.completed ? "" : "scale-0"} transition-all `}
            >
              Learned ✅
            </div>
          </div>
        {:else}
          <div class="card-side card-back p-4">
            {#if outcome.explanation == ""}
              {#key txt}
                {#if txt == ""}
                  <p>Generating from ai...</p>
                {:else}
                  <div
                    class="prose prose-indigo p-2 w-full max-w-none !text-black text-sm"
                    on:load={() => console.log("loaded")}
                  >
                    <h1 class="text-3xl font-bold mb-1 mt-0 !text-black">
                      {txt.title}
                    </h1>
                    <div
                      class="flex flex-row text-sm h-6 items-baseline mb-1 !text-black"
                    >
                      <h2
                        class="badge !bg-black max-h-fit p-2 !text-white m-0 text-sm"
                      >
                        {txt.difficulty || ""}
                      </h2>
                    </div>
                    {@html marked(txt.explanation, {
                      renderer,
                      breaks: true,
                    })}
                    <hr class="my-2" />
                    {#if txt.study_methods}
                      {#if txt.study_methods.higher_order && txt.study_methods.lower_order}
                        <div class="flex flex-col !text-black">
                          <h1 class="text-3xl font-bold my-0 mb-2 !text-black">
                            Study Methods 😉
                          </h1>
                          {#if txt.study_methods.higher_order.length > 0}
                            <h2
                              class="text-2xl font-semibold my-0 ml-2 !text-black"
                            >
                              Higher Order
                            </h2>
                            <ul class="ml-2">
                              {#each txt.study_methods?.higher_order as method}
                                <li class="list-disc">{method}</li>
                              {/each}
                            </ul>
                          {/if}
                          {#if txt.study_methods.lower_order.length > 0}
                            <h2
                              class="text-2xl font-semibold my-0 ml-2 !text-black"
                            >
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
                    <button
                      class="btn absolute bg-secondary border-none text-white hover:bg-primary bottom-1 right-1 opacity-75 scale-0 md:group-hover:scale-100 transition-transform duration-200 ease-in-out"
                      on:click={() => {
                        flipDirection *= -1;
                        currentRotation -= 180 * flipDirection;
                        setTimeout(async () => {
                          showFront = currentRotation % 360 === 0;
                        }, 150);
                      }}>Flip back</button
                    >
                  </div>
                {/if}
              {/key}
            {:else}
              <p>ready explanation for {outcome.explanation}</p>
            {/if}
          </div>
        {/if}
        <div class="">
          <button
            class={`btn absolute bg-primary border-none text-white hover:bg-secondary bottom-1 right-1 opacity-50 md:group-hover:!scale-100 transition-transform duration-200 ease-in-out ${showFront ? "scale-0" : "!scale-0"} `}
            on:click={() => {
              flipDirection *= -1;
              currentRotation += 180 * flipDirection;

              setTimeout(async () => {
                showFront = currentRotation % 360 === 0;
                flipping = false;
                if (!showFront && txt == "") {
                  await explain(outcome.outcome_name, outcome.notes_examples);
                }
              }, 150);
              flipping = true;
            }}>Flip</button
          >
          <button
            class={`btn absolute bg-primary border-none text-white hover:bg-green-500 bottom-1 right-20 opacity-75 !scale-0 md:group-hover:!scale-100 transition-transform duration-200 ease-in-out ${showFront ? "" : "!scale-0"} `}
            on:click={() => {
              handleLongPress();
            }}>Mark as learned</button
          >
        </div>
      </div>
    </div>
  {/key}
{/if}

<style>
  .card-container {
    perspective: 1000px;
  }

  .card {
    width: 100%;
    transition: transform 0.3s ease-in-out;
    position: relative;
    transform-style: preserve-3d;
  }

  .card-side {
    backface-visibility: visible;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 1rem;
  }

  .card-back {
    transform: rotateY(180deg);
  }
  .flip-button {
    backface-visibility: hidden;
  }
  .long-press-target {
    position: relative;
    overflow: hidden;
    user-select: none;
    touch-action: manipulation;
    transition: transform 0.2s ease;
  }

  .progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 100%;
    transition: width 0.1s linear;
  }
</style>
