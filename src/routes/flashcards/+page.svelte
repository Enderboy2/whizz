<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import Popup from "./Popup.svelte";
  import type { PageLoad } from "./$types";
  import type { SupabaseClient } from "@supabase/supabase-js";

  let supabase: SupabaseClient;
  let userEmail: string;
  let flashcards: Flashcard[] = [];
  type Dictionary<T> = { [key: number]: T };
  type Flashcard = {
    question: string;
    answer: string;
    syllabus_id: number;
    chapter_id: number;
    topic_id: number;
    syllabus_name: string;
    chapter_name: string;
    topic_name: string;
  };
  type SyllabusFlashcards = {
    [syllabus_id: string]: Flashcard[];
  };
  let groupedFlashcards: any;
  let syllabusIds: any;
  let loading = true;
  let error: string | null = null;
  const syllabusidstonames = {};
  const chapteridstonames = {};
  const topicidstonames = {};

  export const load: PageLoad = async ({ data }: any) => {
    return data;
  };

  onMount(() => {
    const { supabase: client, session } = $page.data;

    if (!client || !session) {
      error = "Failed to initialize. Please reload the page.";
      loading = false;
      return;
    }

    supabase = client;
    userEmail = session.user.email;

    // Initialize dictionaries

    fetchFlashcards(userEmail)
      .then((data) => (flashcards = data))
      .catch((err) => {
        console.error("Error fetching flashcards:", err);
        error = "Failed to load flashcards. Please try again.";
      })
      .finally(() => {
        console.log("flashcards", flashcards);

        for (let i = 0; i < flashcards.length; i++) {
          const flashcard = flashcards[i];

          // Set syllabus ID to syllabus name
          if (!syllabusidstonames[flashcard.syllabus_id]) {
            syllabusidstonames[flashcard.syllabus_id] = flashcard.syllabus_name;
          }

          // Set chapter ID to chapter name
          if (!chapteridstonames[flashcard.chapter_id]) {
            chapteridstonames[flashcard.chapter_id] = flashcard.chapter_name;
          }

          // Set topic ID to topic name
          if (!topicidstonames[flashcard.topic_id]) {
            topicidstonames[flashcard.topic_id] = flashcard.topic_name;
          }
        }

        console.log("Syllabus Dictionary:", syllabusidstonames);
        console.log("Chapter Dictionary:", chapteridstonames);
        console.log("Topic Dictionary:", topicidstonames);

        loading = false;
      });
  });

  async function fetchFlashcards(userEmail: string) {
    try {
      const { data: flashcardEntries, error: entryError } = await supabase
        .from("flashcard_progress")
        .select("flashcard_id")
        .eq("user_email", userEmail);

      if (entryError) throw entryError;

      const flashcardIds =
        flashcardEntries?.map((entry) => entry.flashcard_id) ?? [];
      if (flashcardIds.length === 0) return [];

      const { data: flashcardsData, error: flashcardError } = await supabase
        .from("flashcards")
        .select()
        .in("id", flashcardIds);

      if (flashcardError) throw flashcardError;
      return flashcardsData;
    } catch (err) {
      console.error("Error fetching flashcards:", err);
      throw err;
    }
  }

  async function deleteFlashcard(flashcard_id: number) {
    try {
      const { error: deleteError } = await supabase
        .from("flashcard_progress")
        .delete()
        .eq("flashcard_id", flashcard_id)
        .eq("user_email", userEmail);

      if (deleteError) {
        console.error("Error deleting flashcard:", deleteError.message);
        return { success: false, error: deleteError.message };
      }
      console.log("flashcard deleted");
      return { success: true }; // Successfully deleted
    } catch (err) {
      console.error("Unexpected error:", err);
      return { success: false, error: "Unexpected error occurred" };
    }
  }

  let selectedSyllabusId: string | null = null;
  let selectedChapterId: string | null = null;
  let selectedTopicId: string | null = null;
  let flashcardsForSelection: any[] = [];
  let showPopup = false;
  $: if (flashcards) {
    groupedFlashcards = flashcards.reduce(
      (acc, flashcard) => {
        if (!acc[flashcard.syllabus_id]) {
          acc[flashcard.syllabus_id] = {};
        }
        if (!acc[flashcard.syllabus_id][flashcard.chapter_id]) {
          acc[flashcard.syllabus_id][flashcard.chapter_id] = {};
        }
        if (
          !acc[flashcard.syllabus_id][flashcard.chapter_id][flashcard.topic_id]
        ) {
          acc[flashcard.syllabus_id][flashcard.chapter_id][flashcard.topic_id] =
            [];
        }
        acc[flashcard.syllabus_id][flashcard.chapter_id][
          flashcard.topic_id
        ].push(flashcard);
        return acc;
      },
      {} as Record<string, Record<string, Record<string, Flashcard[]>>>
    );
    syllabusIds = Object.keys(groupedFlashcards);
  }

  function handleTopicSelection() {
    if (selectedSyllabusId && selectedChapterId && selectedTopicId) {
      flashcardsForSelection =
        groupedFlashcards[selectedSyllabusId][selectedChapterId][
          selectedTopicId
        ];
      showPopup = true; // Show the popup when flashcards are selected
    }
  }

  // Close popup function
  function closePopup() {
    showPopup = false;
  }
</script>

<div class="mt-20 h-full w-full ml-1">
  {#key syllabusIds}
    {#if syllabusIds && syllabusidstonames}
      <h1 class="font-bold text-xl w-full text-center mb-6">
        Select topics to show flashcards for👇
      </h1>
      {#each syllabusIds as syllabusId}
        <div class="border-b pb-4">
          <button
            class="btn text-xl font-bold text-primary bg-white border-2 border-gray-200 transition-colors duration-300"
            class:text-secondary={selectedSyllabusId === syllabusId}
            on:click={() =>
              (selectedSyllabusId =
                selectedSyllabusId === syllabusId ? null : syllabusId)}
          >
            {syllabusidstonames[syllabusId]}
          </button>

          {#if selectedSyllabusId === syllabusId}
            <div class="ml-4 mt-2">
              {#each Object.keys(groupedFlashcards[syllabusId]) as chapterId}
                <div class="mb-4">
                  <button
                    class="btn text-lg font-bold text-primary bg-white border-2 border-gray-200
                    transition-colors duration-300"
                    class:text-secondary={selectedChapterId === chapterId}
                    on:click={() =>
                      (selectedChapterId =
                        selectedChapterId === chapterId ? null : chapterId)}
                  >
                    {chapteridstonames[chapterId]}
                  </button>

                  {#if selectedChapterId === chapterId}
                    <div class="ml-4 mt-2">
                      {#each Object.keys(groupedFlashcards[syllabusId][chapterId]) as topicId}
                        <div class="mb-2">
                          <button
                            class="hover:text-secondary p-1 text-sm font-bold text-wrap text-primary bg-white border-2 h-fit border-gray-200 transition-colors
                            duration-300"
                            class:text-secondary={selectedTopicId === topicId}
                            on:click={() =>
                              (selectedTopicId =
                                selectedTopicId === topicId ? null : topicId)}
                          >
                            {topicidstonames[topicId]}
                          </button>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}

      <!-- Button to show flashcards in the popup -->
      <button
        class="mt-4 p-2 bg-blue-500 text-white rounded"
        on:click={handleTopicSelection}
        disabled={!selectedSyllabusId || !selectedChapterId || !selectedTopicId}
      >
        Show Selected Flashcards
      </button>

      <!-- Conditionally render the popup when showPopup is true -->
      {#if showPopup}
        <Popup
          flashcards={flashcardsForSelection}
          onClose={closePopup}
          {deleteFlashcard}
        />
      {/if}
    {:else}
      <div class="text-center text-gray-500">No flashcards available.</div>
    {/if}
  {/key}
</div>
