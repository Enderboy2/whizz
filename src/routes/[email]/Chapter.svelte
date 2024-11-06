<script lang="ts">
  import { ProgressBar } from "@skeletonlabs/skeleton";

  export let c; // Chapter
  export let data;

  let { supabase, session } = data;
  $: ({ supabase, session } = data);

  let topics: any[] = [];
  let isOpen = false;
  let isLoading = false;
  let totalOutcomes = 0;
  let completedOutcomes = 0;
  let completedTopics = 0;
  let chapterNumberColors = ["text-secondary", "text-primary"];
  let chapterNumberColor =
    chapterNumberColors[Math.floor(Math.random() * chapterNumberColors.length)];

  // Fetch topics and outcomes with progress
  const fetchTopics = async () => {
    isLoading = true;
    console.log("Fetching topics for chapter:", c.chapter_id); // Debug log

    if (c && c.chapter_id && !topics.length) {
      const { data: topicData, error: topicError } = await supabase
        .from("topics")
        .select()
        .eq("chapter_id", c.chapter_id);

      console.log("Topics fetched:", topicData); // Debug log

      if (topicError) {
        console.error("Error fetching topics:", topicError);
        isLoading = false;
        return;
      }

      topics = topicData;

      await Promise.all(
        topics.map(async (t) => {
          if (!t.topic_id) {
            console.error("Invalid topic_id:", t);
            return; // Skip invalid topic
          }

          console.log(`Fetching outcomes for topic: ${t.topic_id}`); // Debug log

          // Fetch all outcomes for the topic
          const { data: outcomes, error: outcomeError } = await supabase
            .from("outcomes")
            .select()
            .eq("topic_id", t.topic_id);

          console.log(`Outcomes for topic ${t.topic_id}:`, outcomes); // Debug log

          if (outcomeError) {
            console.error("Error fetching outcomes:", outcomeError);
            return;
          }

          t.outcomes = outcomes;
          totalOutcomes += outcomes.length;

          if (outcomes.length > 0) {
            const validOutcomeIds = outcomes
              .map((o: any) => o.id)
              .filter((id: any) => id);
            console.log(
              `Valid outcome IDs for topic ${t.topic_id}:`,
              validOutcomeIds
            ); // Debug log

            const { data: progress, error: progressError } = await supabase
              .from("user_progress")
              .select("outcome_id")
              .eq("user_email", session.user.email)
              .in("outcome_id", validOutcomeIds);

            console.log(`Progress for topic ${t.topic_id}:`, progress); // Debug log

            if (progressError) {
              console.error("Error fetching progress:", progressError);
              return;
            }

            const completedOutcomeIds = progress.map((p: any) => p.outcome_id);
            console.log(
              `Completed outcome IDs for topic ${t.topic_id}:`,
              completedOutcomeIds
            ); // Debug log

            t.completedOutcomes = outcomes.filter((o: any) =>
              completedOutcomeIds.includes(o.id)
            ).length;

            completedOutcomes += t.completedOutcomes;

            if (t.completedOutcomes === outcomes.length) {
              completedTopics++;
            }
          }
        })
      );
    }
    isLoading = false;
  };

  const toggleOpen = () => {
    isOpen = !isOpen;
  };

  // Calculate chapter completion percentage
  $: chapterCompletion = (completedTopics / topics.length) * 100 || 0;

  $: if (topics.length === 0) {
    fetchTopics();
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="cursor-pointer border border-gray-300 bg-white rounded-md p-4 shadow-sm max-w-full mx-4"
  on:click={toggleOpen}
>
  <div class="flex justify-between items-center">
    <h1 class="font-bold text-xl text-black">
      <span class={chapterNumberColor}>{c.chapter_number}.</span>
      {c.chapter_name}
    </h1>
  </div>

  <!-- Chapter Completion Progress Bar -->
  <ProgressBar
    value={chapterCompletion}
    max={100}
    meter="bg-primary"
    track="bg-white"
    height="h-2"
    rounded="rounded-sm"
  />

  <div
    class={`overflow-hidden transition-all duration-500 ${
      isOpen ? "max-h-[1000px]" : "max-h-0"
    }`}
  >
    <div class="mt-2">
      {#if isLoading}
        <div class="text-center p-4 text-gray-500">Loading topics...</div>
      {/if}

      {#if !isLoading && topics.length > 0}
        {#each topics as t}
          <div class="mb-2">
            <a
              href={`/topic/${t.topic_id}`}
              class="bg-black text-white rounded-md py-2 px-3 font-semibold block text-center"
            >
              {t.topic_name}
            </a>

            <ProgressBar
              value={(t.completedOutcomes / t.outcomes.length) * 100}
              max={100}
              meter="bg-secondary"
              track="bg-white"
              height="h-2"
              rounded="rounded-sm"
            />
          </div>
        {/each}
      {/if}

      {#if !isLoading && topics.length === 0}
        <div class="text-center p-4 text-gray-500">
          <ProgressBar value={undefined} />
        </div>
      {/if}
    </div>
  </div>
</div>
