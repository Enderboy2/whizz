<script lang="ts">
  import type { SupabaseClient } from "@supabase/supabase-js";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import type { PageLoad } from "./$types";
  import { page } from "$app/stores";
  export let flashcards: any;
  flashcards = flashcards.flashcards;
  console.log(
    "flashcard id right after init -> ",
    flashcards[0].id,
    flashcards[0]
  );
  let currentIndex = 0;
  let startX = 0;
  let deltaX = 0;
  let isSwiping = false;
  let transition = "transform 0.5s cubic-bezier(0.25, 0.8, 0.5, 1)";
  let userEmail: string;
  let isCardClicked = Array(flashcards.length).fill(false);
  let supabase: SupabaseClient;

  interface FlashcardRecord {
    flashcard_id: number;
    user_email: string;
  }

  export const load: PageLoad = async ({ data }: { data: any }) => {
    const { supabase, session } = data;
    return { supabase, session };
  };

  onMount(async () => {
    const { supabase: client, session } = await load({ data: $page.data });
    supabase = client;
    userEmail = session.user.email;
    console.log(userEmail);
    console.log((await isFlashcardAdded(1, userEmail)).exists);
    console.log(flashcards);
    for (let i = 0; i < flashcards.length; i++) {
      flashcards[i].added = (
        await isFlashcardAdded(flashcards[i].id, userEmail)
      ).exists;
      console.log("added", flashcards[i].added);
    }
  });

  const toggleFlashcard = async (
    record: FlashcardRecord
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check if the record already exists
      const { data: existingRecord, error: selectError } = await supabase
        .from("flashcard_progress") // Replace with your table name
        .select("*")
        .eq("flashcard_id", record.flashcard_id)
        .eq("user_email", record.user_email)
        .maybeSingle();

      if (selectError && !selectError.message.includes("No rows")) {
        // Log detailed error if it’s not "No rows found"
        console.error(
          "Error checking for existing record:",
          selectError.message
        );
        return { success: false, error: selectError.message };
      }

      if (existingRecord) {
        // If the record exists, delete it
        const { error: deleteError } = await supabase
          .from("flashcard_progress")
          .delete()
          .eq("flashcard_id", record.flashcard_id)
          .eq("user_email", record.user_email);

        if (deleteError) {
          console.error("Error deleting record:", deleteError.message);
          return { success: false, error: deleteError.message };
        }
        console.log("record deleted");
        return { success: true }; // Successfully deleted
      } else {
        // If the record doesn't exist, insert it
        const { error: insertError } = await supabase
          .from("flashcard_progress")
          .insert(record);

        if (insertError) {
          console.error("Error inserting record:", insertError.message);
          return { success: false, error: insertError.message };
        }
        console.log("record inserted");
        return { success: true }; // Successfully inserted
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      return { success: false, error: "Unexpected error occurred" };
    }
  };

  const isFlashcardAdded = async (
    flashcard_id: number,
    user_email: string
  ): Promise<{ exists: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from("flashcard_progress") // Replace with your table name
        .select("id") // Select only the `id` or any unique column for efficiency
        .eq("flashcard_id", flashcard_id)
        .eq("user_email", user_email)
        .single();

      if (error && error.code !== "PGRST116") {
        // Handle unexpected errors
        console.error("Error checking if flashcard exists:", error.message);
        return { exists: false, error: error.message };
      }

      // If `data` is found, the record exists
      return { exists: Boolean(data) };
    } catch (err) {
      console.error("Unexpected error:", err);
      return { exists: false, error: "Unexpected error occurred" };
    }
  };

  function handleTouchStart(event: TouchEvent) {
    startX = event.touches[0].clientX;
    deltaX = 0;
    isSwiping = true;
    transition = "none";
  }

  function handleTouchMove(event: TouchEvent) {
    if (isSwiping) {
      deltaX = event.touches[0].clientX - startX;
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    const endX = event.changedTouches[0].clientX;
    const swipeDistance = startX - endX;
    isSwiping = false;

    if (swipeDistance > 50 && currentIndex < flashcards.length - 1) {
      currentIndex++;
      resetCardState(currentIndex);
    } else if (swipeDistance < -50 && currentIndex > 0) {
      currentIndex--;
      resetCardState(currentIndex);
    }

    transition = "transform 0.5s cubic-bezier(0.25, 0.8, 0.5, 1)";
    deltaX = 0;
  }

  function handleCardClick(index: number) {
    isCardClicked[index] = true;
  }

  async function handleAddToDeck(index: number) {
    flashcards[index].added = !flashcards[index].added;
    console.log(flashcards[index].id);
    await toggleFlashcard({
      flashcard_id: flashcards[index].id,
      user_email: userEmail,
    });
  }

  async function handleAddAllToDeck() {
    flashcards.forEach(async (card: { added: boolean; id: number }) => {
      card.added = true;
      await toggleFlashcard({
        flashcard_id: card.id,
        user_email: userEmail,
      });
      console.log("added flashcard", card.id);
    });
  }

  function resetCardState(index: number) {
    isCardClicked = isCardClicked.map((_, i) => (i === index ? false : _));
  }

  function isCardAdded(index: number) {
    return isFlashcardAdded(flashcards[index].id, userEmail);
  }
</script>

<div
  class="relative overflow-hidden !overflow-y-visible h-full items-center w-full bg-transparent flex flex-col justify-center"
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
>
  {#if flashcards.length > 0}
    <div
      class="flex transition-transform max-w-full"
      style="transform: translateX(calc(-{currentIndex} * 100%)); transition: {transition};"
    >
      {#each flashcards as flashcard, index}
        {#key flashcard.added}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="flex-shrink-0 w-full mx-auto p-3 rounded-md !bg-white border-2 border-primary shadow-2xl transform h-96"
            style="transform: translateX({index === currentIndex
              ? deltaX
              : 0}px) rotate({index === currentIndex
              ? deltaX / 20
              : 0}deg); transition: {transition}; opacity: {Math.max(
              1 - Math.abs(deltaX) / 300,
              0.6
            )};"
            on:click={() => handleCardClick(index)}
          >
            <h2 class="text-2xl font-bold mb-4">{flashcard.question}</h2>

            {#if isCardClicked[index]}
              <p class=" text-gray-600 mb-4 text-2xl" in:fade>
                {flashcard.answer}
              </p>
            {/if}
            {#key flashcard.added}
              <button
                class="
              mt-4 px-4 py-2 rounded-md bg-primary text-white hover:bg-secondary absolute bottom-1 right-1 font-semibold
              "
                on:click={() => handleAddToDeck(index)}
              >
                {#if flashcard.added}
                  -
                {:else}
                  +
                {/if}
              </button>
            {/key}
          </div>
        {/key}
      {/each}
    </div>

    <div
      class="absolute top-2 right-2 transform p-4 rounded-lg text-2xl text-primary font-bold"
    >
      <span class="text-secondary">{currentIndex + 1}</span> /
      <span class="text-primary">{flashcards.length}</span>
    </div>

    <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-4">
      <button
        class="px-6 py-2 rounded-md bg-primary text-white hover:bg-secondary"
        on:click={handleAddAllToDeck}
      >
        Add all to your deck
      </button>
    </div>
  {:else}
    <p class="text-gray-500 text-center w-full">No flashcards available.</p>
  {/if}
</div>
