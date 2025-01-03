<script lang="ts">
  import ProgressBar from "./ProgressBar.svelte";
  import MenuButton from "./MenuButton.svelte";
  import { fade } from "svelte/transition";

  interface Flashcard {
    question: string;
    answer: string;
    clicked: boolean;
    syllabus_id: number;
    chapter_id: number;
    topic_id: number;
    syllabus_name: string;
    chapter_name: string;
    topic_name: string;
  }

  export let flashcards: Flashcard[] = [];
  export let onClose: () => void;
  export let deleteFlashcard: (
    flashcard_id: number
  ) => Promise<{ success: boolean; error?: string }>;
  let currentCardIndex = 0;

  // Function to handle card click and toggle the clicked state
  function revealAnswer(index: number) {
    flashcards = flashcards.map((card, i) =>
      i === index ? { ...card, clicked: true } : card
    );
  }

  // Function to handle option selection and move to the next card
  function selectOption(option: string) {
    console.log(option);

    if (currentCardIndex < flashcards.length - 1) {
      currentCardIndex++;
      resetCardClickState();
    } else {
      console.log("finish");
      onClose();
    }
  }

  // Reset the clicked state of the current card when moving to the next card
  function resetCardClickState() {
    flashcards = flashcards.map((card, index) =>
      index === currentCardIndex ? { ...card, clicked: false } : card
    );
  }
</script>

<div
  class="absolute inset-0 z-50 bg-white flex flex-col justify-center items-center h-full w-screen overflow-hidden top-0 animate-fade-in"
>
  <div class="w-full max-w-md h-full mt-6">
    {#if flashcards.length > 0}
      <div class="mb-4 flex items-center absolute top-5 w-full">
        <div class="flex flex-col w-full">
          <div class=" w-full flex justify-center mb-2">
            <p
              class="text-gray-700 font-bold mb-1 text-center badge border-white bg-gray-200"
            >
              🚩{flashcards.length - currentCardIndex}
            </p>
          </div>

          <ProgressBar total={flashcards.length} current={currentCardIndex} />
        </div>
      </div>
      <MenuButton
        onDelete={() => deleteFlashcard(flashcards[currentCardIndex].id)}
      />
      <div class="absolute left-0 top-1">
        <button class="btn btn-ghost bg-opacity-50" on:click={() => onClose()}
          >❌</button
        >
      </div>

      {#key flashcards}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="bg-white rounded-md w-full mt-10 px-1 cursor-pointer min-h-full"
          on:click|stopPropagation={() =>
            !flashcards[currentCardIndex].clicked &&
            revealAnswer(currentCardIndex)}
        >
          <div class="flex flex-col">
            <p class="text-gray-600 mb-1">
              {flashcards[currentCardIndex].syllabus_name}
            </p>
            <p
              class="badge border-gray-200 bg-white border-2 text-primary font-semibold text-lg px-1 px-1 mb-2 text-wrap h-fit py-1"
            >
              {flashcards[currentCardIndex].topic_name}
            </p>
          </div>
          <p class="font-bold text-2xl">
            {flashcards[currentCardIndex].question}
          </p>
          <br />
          {#if flashcards[currentCardIndex].clicked}
            <p class="text-gray-500 font-semibold text-xl px-2" in:fade>
              {flashcards[currentCardIndex].answer}
            </p>

            <div
              class="mt-6 flex justify-around absolute bottom-4 w-[98%] max-w-screen"
            >
              {#each [["❌", "forgot"], ["😬", "hard"], ["😆", "good"], ["👑", "easy"]] as option}
                <button
                  class="bg-white border-gray-200 border-2 p-4 px-7 rounded-md hover:bg-secondary/90"
                  on:click={() => {
                    selectOption(option);
                  }}
                >
                  <p>{option[0]}</p>
                  <p class=" text-xs">{option[1]}</p>
                </button>
              {/each}
            </div>
          {:else}
            <div class=" w-full flex justify-center">
              <button
                class="mt-4 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 bottom-4 absolute w-[90%] h-16 max-w-2xl"
                on:click={() => revealAnswer(currentCardIndex)}
              >
                Show Answer
              </button>
            </div>
          {/if}
        </div>
      {/key}
    {:else}
      <p class="text-gray-700 text-center">No flashcards available.</p>
    {/if}
  </div>
</div>
