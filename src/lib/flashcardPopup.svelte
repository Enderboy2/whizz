<script lang="ts">
  export let currentSubject: string;
  export let selectedChapters: string[];
  export let onclose: () => void;

  let currentCard = 0;
  const flashcards = [
    { question: "What is 2+2?", answer: "4" },
    {
      question: "Define photosynthesis.",
      answer: "Process by which plants make food.",
    },
  ];
</script>

<div class="mt-6">
  <h2 class="text-xl font-semibold mb-4">Practicing {currentSubject}</h2>
  <p>Chapters: {selectedChapters.join(", ") || "All"}</p>

  <div class="flashcard bg-gray-100 p-6 rounded-lg shadow-md mt-4">
    <p class="font-semibold text-lg">{flashcards[currentCard].question}</p>
    <button class="btn btn-secondary mt-4" on:click={() => currentCard++}>
      Next
    </button>
  </div>

  <button class="btn btn-error mt-4" on:click={onclose}>Close</button>
</div>
