<script>
  export let paper;
  import { quintOut } from "svelte/easing";
  import { fade } from "svelte/transition";
  import { onMount, onDestroy } from "svelte";
  import { createEventDispatcher } from "svelte";
  export let supabaseClient;
  export let profileData;
  export let syllabusId;
  export let syllabus;
  export let yearRange;
  // Destructure once and rename to avoid conflicts

  let pastPapers = [];
  let loading = true;
  let error = null;
  let currentYearIndex = 0;
  let groupedPapers = {};
  let sortedYears = [];
  let paperProgress = {};
  let paperMarks = {};
  $: paperMarks;
  $: currentYearIndex;

  // Calculate year averages reactively
  $: yearAverages =
    pastPapers?.reduce((acc, paper) => {
      const year = paper.year;
      if (!acc[year]) {
        acc[year] = { totalMarks: 0, totalPapers: 0 };
      }
      if (paperProgress[paper.id] && paperMarks[paper.id] !== undefined) {
        acc[year].totalMarks += paperMarks[paper.id];
        acc[year].totalPapers++;
      }
      return acc;
    }, {}) || {};

  // Add console logs to debug the values
  $: console.log("Props:", { paper, profileData, syllabusId, yearRange });

  // Convert two-digit year to four-digit year
  function expandYear(twoDigitYear) {
    return 2000 + parseInt(twoDigitYear);
  }

  // Filter papers based on year range
  $: {
    groupedPapers = pastPapers
      .filter((paper) => {
        const fullYear = expandYear(paper.year);
        return fullYear >= yearRange.start && fullYear <= yearRange.end;
      })
      .reduce((acc, paper) => {
        if (!acc[paper.year]) {
          acc[paper.year] = {};
        }
        if (!acc[paper.year][paper.session]) {
          acc[paper.year][paper.session] = [];
        }
        acc[paper.year][paper.session].push(paper);
        return acc;
      }, {});

    sortedYears = Object.keys(groupedPapers).sort((a, b) => b - a);
  }

  // Calculate progress for each year and overall
  $: yearProgress = sortedYears.reduce((acc, year) => {
    const yearPapers = Object.values(groupedPapers[year])
      .flat()
      .map((paper) => paper.id);

    const completedCount = yearPapers.filter((id) => paperProgress[id]).length;

    acc[year] = {
      total: yearPapers.length,
      completed: completedCount,
      percentage: Math.round((completedCount / yearPapers.length) * 100) || 0,
    };
    return acc;
  }, {});

  // Calculate overall progress
  $: overallProgress = sortedYears.reduce(
    (acc, year) => {
      acc.total += yearProgress[year].total;
      acc.completed += yearProgress[year].completed;
      return acc;
    },
    { total: 0, completed: 0 }
  );

  // Helper function to get formatted average
  function getYearAverage(year) {
    if (!yearAverages[year] || yearAverages[year].totalPapers === 0)
      return null;
    return {
      marks: Math.round(
        yearAverages[year].totalMarks / yearAverages[year].totalPapers
      ),
      maxMarks: maxMarks,
    };
  }

  // Helper function to get circle color based on progress
  function getProgressColor(year) {
    const progress = yearProgress[year];
    if (progress.completed === 0) return "bg-gray-300 hover:bg-gray-400";
    if (progress.completed === progress.total)
      return "bg-green-500 hover:bg-green-600";
    return "bg-blue-500 hover:bg-blue-600";
  }

  // Track tilt elements for each year
  let tiltElements = new Map();
  let isHovering = false;
  let rafId = null;

  function handleMouseMove(event, elementId) {
    const tiltElement = tiltElements.get(elementId);
    if (!tiltElement || !isHovering) return;

    if (rafId) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      const rect = tiltElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const maxRotate = 3;

      const rotateX = ((y - centerY) / centerY) * -maxRotate;
      const rotateY = ((x - centerX) / centerX) * maxRotate;

      tiltElement.style.transform = `
        perspective(1000px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        scale3d(1.02, 1.02, 1.02)
      `;
    });
  }

  function handleMouseEnter(elementId) {
    isHovering = true;
    const tiltElement = tiltElements.get(elementId);
    if (tiltElement) {
      tiltElement.style.transition = "transform 0.1s ease-out";
    }
  }

  function handleMouseLeave(elementId) {
    isHovering = false;
    const tiltElement = tiltElements.get(elementId);
    if (tiltElement) {
      tiltElement.style.transition = "transform 0.3s ease-out";
      tiltElement.style.transform = `
        perspective(1000px)
        rotateX(0deg)
        rotateY(0deg)
        scale3d(1, 1, 1)
      `;
    }
  }

  onDestroy(() => {
    if (rafId) cancelAnimationFrame(rafId);
    tiltElements.clear();
  });

  function handleScroll(e) {
    if (rafId) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      const container = e.target;
      const scrollPosition = container.scrollTop;
      const yearHeight = container.scrollHeight / sortedYears.length;
      currentYearIndex = Math.round(scrollPosition / yearHeight);
    });
  }

  // Get max marks for current paper
  $: maxMarks = syllabus.papers[paper]?.max_marks || 100; // fallback to 100 if not specified

  const dispatch = createEventDispatcher();

  // Fetch both papers and progress
  async function fetchPastPapers() {
    if (!paper || !profileData?.id || !syllabusId) {
      console.error("Missing required values:", {
        paper,
        userId: profileData?.id,
        syllabusId,
      });
      error = "Missing required data";
      loading = false;
      return;
    }

    try {
      const [papersResponse, progressResponse] = await Promise.all([
        supabaseClient
          .from("past_papers")
          .select("id, year, session, variant")
          .order("year", { ascending: false })
          .order("session", { ascending: true })
          .order("variant", { ascending: true }),

        supabaseClient
          .from("user_paper_progress")
          .select("paper_id, marks")
          .eq("user_id", profileData.id)
          .eq("syllabus_id", syllabusId)
          .eq("paper", paper),
      ]);

      if (papersResponse.error) throw papersResponse.error;
      if (progressResponse.error) throw progressResponse.error;

      pastPapers = papersResponse.data;

      // Store both completion status and marks
      progressResponse.data.forEach((progress) => {
        paperProgress[progress.paper_id] = true;
        if (progress.marks !== null) {
          paperMarks[progress.paper_id] = progress.marks;
        }
      });
    } catch (e) {
      error = e.message;
      console.error("Error fetching data:", e);
    } finally {
      loading = false;
    }
  }

  async function togglePaperCompletion(pastPaper, marks = null) {
    try {
      const isCurrentlyCompleted = paperProgress[pastPaper.id] || false;

      if (isCurrentlyCompleted) {
        // Delete the record if it exists
        const { error: deleteError } = await supabaseClient
          .from("user_paper_progress")
          .delete()
          .eq("user_id", profileData.id)
          .eq("syllabus_id", syllabusId)
          .eq("paper", paper)
          .eq("paper_id", pastPaper.id);

        if (deleteError) throw deleteError;

        // Clear local marks
        delete paperMarks[pastPaper.id];
      } else {
        // Insert new record with optional marks
        const { error: insertError } = await supabaseClient
          .from("user_paper_progress")
          .insert({
            paper_id: pastPaper.id,
            user_id: profileData.id,
            syllabus_id: syllabusId,
            paper: paper,
            completed_at: new Date().toISOString(),
            marks: marks,
          });

        if (insertError) throw insertError;

        // Update local marks if provided
        if (marks !== null) {
          paperMarks[pastPaper.id] = marks;
        }
      }

      // Update local completion status
      paperProgress = {
        ...paperProgress,
        [pastPaper.id]: !isCurrentlyCompleted,
      };
    } catch (e) {
      console.error("Error toggling paper completion:", e);
    }
  }

  async function updateMarks(pastPaper, marks) {
    try {
      if (marks !== null && (marks < 0 || marks > maxMarks)) {
        return;
      }

      const { error: updateError } = await supabaseClient
        .from("user_paper_progress")
        .update({ marks })
        .eq("user_id", profileData.id)
        .eq("syllabus_id", syllabusId)
        .eq("paper", paper)
        .eq("paper_id", pastPaper.id);

      if (updateError) throw updateError;

      paperMarks = {
        ...paperMarks,
        [pastPaper.id]: marks,
      };

      // Dispatch progress update event
      dispatch("progressUpdate", {
        paper,
        paperId: pastPaper.id,
        marks,
      });
    } catch (e) {
      console.error("Error updating marks:", e);
    }
  }

  async function toggleSessionCompletion(year, session, papers) {
    try {
      const sessionPaperIds = papers.map((p) => p.id);
      const isCurrentlyCompleted = sessionPaperIds.every(
        (id) => paperProgress[id]
      );

      if (isCurrentlyCompleted) {
        // Delete all records for this session
        const { error: deleteError } = await supabaseClient
          .from("user_paper_progress")
          .delete()
          .eq("user_id", profileData.id)
          .eq("syllabus_id", syllabusId)
          .eq("paper", paper)
          .in("paper_id", sessionPaperIds);

        if (deleteError) throw deleteError;

        // Clear local marks for the session
        sessionPaperIds.forEach((id) => delete paperMarks[id]);
      } else {
        // Insert records for all papers in session (without marks)
        const inserts = papers.map((pastPaper) => ({
          paper_id: pastPaper.id,
          user_id: profileData.id,
          syllabus_id: syllabusId,
          paper: paper,
          completed_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabaseClient
          .from("user_paper_progress")
          .insert(inserts);

        if (insertError) throw insertError;
      }

      // Update local state
      paperProgress = {
        ...paperProgress,
        ...sessionPaperIds.reduce((acc, id) => {
          acc[id] = !isCurrentlyCompleted;
          return acc;
        }, {}),
      };
    } catch (e) {
      console.error("Error toggling session completion:", e);
    }
  }

  // Function to generate array of dots (now using a dynamic count)
  function generateDots() {
    return Array.from({ length: 30 }, (_, i) => i + 1); // Reduced dot count for better fit
  }

  // Function to get dot color based on marks ratio
  function getDotColor(dotPosition, currentMarks, maxMarks) {
    if (!currentMarks) return "bg-gray-100 bg-opacity-30";
    // Calculate how many dots should be filled based on the marks ratio
    const ratio = currentMarks / maxMarks;
    const dotsToFill = Math.round(30 * ratio);
    return dotPosition <= dotsToFill
      ? "bg-green-500 bg-opacity-30"
      : "bg-gray-100 bg-opacity-50";
  }

  let inputFocused = false;

  onMount(() => {
    fetchPastPapers();
  });

  // Create a tilt effect action
  function tiltEffect(node, { year }) {
    if (node) {
      tiltElements.set(year, node);
    }

    const handleMove = (e) => handleMouseMove(e, year);
    const handleEnter = () => handleMouseEnter(year);
    const handleLeave = () => handleMouseLeave(year);

    node.addEventListener("mousemove", handleMove);
    node.addEventListener("mouseenter", handleEnter);
    node.addEventListener("mouseleave", handleLeave);

    return {
      destroy() {
        tiltElements.delete(year);
        node.removeEventListener("mousemove", handleMove);
        node.removeEventListener("mouseenter", handleEnter);
        node.removeEventListener("mouseleave", handleLeave);
      },
    };
  }
</script>

{#if !paper || !profileData?.id || !syllabusId}
  <div class="p-4 text-red-500">
    <ul class="list-disc pl-4">
      {#if !paper}<li>Paper ID missing</li>{/if}
      {#if !profileData?.id}<li>User ID missing</li>{/if}
      {#if !syllabusId}<li>Syllabus ID missing</li>{/if}
    </ul>
  </div>
{:else}
  <!-- Wrapper for both main content and scroll indicator -->
  <div class="relative flex">
    <!-- Main content -->
    <div class="flex-1">
      <!-- Overall progress section -->
      <div class="bg-white p-4 shadow-sm mb-4">
        <div class="max-w-7xl mx-auto">
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
              Paper {paper}
            </h1>
            <span class="text-lg sm:text-xl text-gray-600">
              {syllabus?.syllabus_name} - {syllabus?.syllabus_code}
            </span>
          </div>

          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >
            <span class="text-lg font-medium text-gray-600"
              >Overall Progress</span
            >
            <div class="flex-1 sm:w-[60%] bg-gray-200 rounded-full h-2">
              <div
                class="{overallProgress.completed === overallProgress.total
                  ? 'bg-green-500'
                  : 'bg-blue-500'} h-2 rounded-full transition-all duration-300"
                style="width: {(overallProgress.completed /
                  overallProgress.total) *
                  100 || 0}%"
              />
            </div>
            <span class="text-lg font-medium text-gray-800">
              {overallProgress.completed}/{overallProgress.total}
            </span>
          </div>
        </div>
      </div>

      <!-- Scrollable years container -->
      <div class="relative h-[calc(100vh-16rem)]">
        <div
          id="years-container"
          class="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
          on:scroll={handleScroll}
        >
          {#if loading}
            <div class="h-full flex items-center justify-center">
              <p class="text-xl text-gray-600 text-center">
                Loading past papers...
              </p>
            </div>
          {:else if error}
            <div class="h-full flex items-center justify-center">
              <p class="text-xl text-red-500 text-center">{error}</p>
            </div>
          {:else if sortedYears.length === 0}
            <div class="text-center py-8">
              <p class="text-xl">No past papers found</p>
            </div>
          {:else}
            {#each sortedYears as year, i}
              <!-- Keep all year sections in DOM but only show content for current year -->
              <div class="h-[calc(100vh-16rem)] snap-start py-4">
                {#if i === currentYearIndex}
                  <div
                    class="max-w-7xl mx-auto px-4"
                    in:fade={{ duration: 300, easing: quintOut }}
                    out:fade={{ duration: 300, easing: quintOut }}
                  >
                    <div
                      use:tiltEffect={{ year }}
                      class="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 will-change-transform"
                      style="transform-style: preserve-3d; backface-visibility: hidden;"
                    >
                      <!-- Year header -->
                      <div
                        class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4"
                      >
                        <h2
                          class="text-3xl sm:text-4xl font-bold text-gray-800"
                        >
                          20{year}
                        </h2>
                        <div class="flex items-center gap-4">
                          <div class="flex items-center gap-2">
                            {#if getYearAverage(year)}
                              <span class="text-lg text-gray-600">Average:</span
                              >
                              <span class="text-xl font-semibold text-gray-800">
                                {getYearAverage(year).marks}/{getYearAverage(
                                  year
                                ).maxMarks}
                              </span>
                            {/if}
                          </div>
                          <span class="text-xl text-gray-600">
                            {yearProgress[year].completed}/{yearProgress[year]
                              .total}
                          </span>
                          <div
                            class="w-24 sm:w-32 bg-gray-200 rounded-full h-2.5"
                          >
                            <div
                              class="{yearProgress[year].completed ===
                              yearProgress[year].total
                                ? 'bg-green-500'
                                : 'bg-blue-500'} h-2.5 rounded-full transition-all duration-300"
                              style="width: {yearProgress[year].percentage}%"
                            />
                          </div>
                        </div>
                      </div>

                      <!-- Sessions -->
                      <div class="space-y-6">
                        {#each Object.entries(groupedPapers[year]) as [session, papers]}
                          <div
                            class="bg-gray-50 rounded-xl p-5"
                            in:fade={{
                              duration: 300,
                              delay: 150,
                              easing: quintOut,
                            }}
                          >
                            <div
                              class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3"
                            >
                              <h3 class="text-2xl font-bold text-gray-700">
                                {session}
                              </h3>
                              <button
                                class="flex items-center gap-2 px-4 py-2 rounded-lg text-lg font-medium transition-colors duration-200
                                  {papers.every((p) => paperProgress[p.id])
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                                on:click={() =>
                                  toggleSessionCompletion(
                                    year,
                                    session,
                                    papers
                                  )}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  class="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fill-rule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clip-rule="evenodd"
                                  />
                                </svg>
                                {papers.every((p) => paperProgress[p.id])
                                  ? "Completed"
                                  : "Complete All"}
                              </button>
                            </div>

                            <!-- Paper variants grid -->
                            <div
                              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                            >
                              {#each papers as paper}
                                <div
                                  class="relative group rounded-xl shadow-sm p-4 hover:shadow-lg transition-all duration-300 border-2
                                    {paperProgress[paper.id]
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-white border-gray-100'}"
                                  transition:fade={{
                                    duration: 300,
                                    easing: quintOut,
                                  }}
                                >
                                  <!-- Background dots -->
                                  {#if paperProgress[paper.id]}
                                    <div
                                      class="absolute inset-0 flex items-center justify-center"
                                    >
                                      <div
                                        class="grid grid-cols-10 gap-1.5 p-4"
                                      >
                                        {#each generateDots() as dot}
                                          <div
                                            class="w-1.5 h-1.5 rounded-full transition-colors duration-300 ease-out
                                              {getDotColor(
                                              dot,
                                              paperMarks[paper.id],
                                              maxMarks
                                            )}"
                                          ></div>
                                        {/each}
                                      </div>
                                    </div>
                                  {/if}

                                  <!-- Content (now above the dots) -->
                                  <div class="relative flex flex-col gap-3">
                                    <div
                                      class="flex items-center justify-between"
                                    >
                                      <button
                                        class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200
                                          {paperProgress[paper.id]
                                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
                                        on:click={() =>
                                          togglePaperCompletion(paper)}
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          class="h-5 w-5"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                        >
                                          <path
                                            fill-rule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clip-rule="evenodd"
                                          />
                                        </svg>
                                      </button>

                                      <div class="flex items-center gap-2">
                                        <span
                                          class="text-lg font-semibold text-gray-400"
                                          >Variant</span
                                        >
                                        <span
                                          class="text-2xl font-bold text-gray-800"
                                          >{paper.variant}</span
                                        >
                                      </div>

                                      <div class="flex">
                                        <button
                                          class="text-lg font-medium text-blue-600 hover:text-blue-800"
                                          title="Download Question Paper"
                                        >
                                          Q
                                        </button>
                                        /
                                        <button
                                          class="text-lg font-medium text-blue-600 hover:text-blue-800"
                                          title="Download Mark Scheme"
                                        >
                                          MS
                                        </button>
                                      </div>
                                    </div>

                                    <!-- Marks display -->
                                    {#if paperProgress[paper.id]}
                                      <div class="relative">
                                        <div
                                          class="absolute right-0 bottom-[-0.45rem] text-sm text-gray-500"
                                        >
                                          {paperMarks[paper.id] || 0}/{maxMarks}
                                        </div>
                                      </div>
                                    {/if}
                                  </div>

                                  <!-- Hover input - Updated positioning and styling -->
                                  {#if paperProgress[paper.id]}
                                    <div
                                      class="absolute z-50 left-0 right-0 top-full mt-2
                                        scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100
                                        transition-all duration-200 origin-top"
                                    >
                                      <div
                                        class="flex items-center justify-center gap-2 bg-gray-50 shadow-lg rounded-lg px-3 py-2 border border-gray-200"
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          max={maxMarks}
                                          class="w-16 text-center px-2 py-1 border rounded-md text-lg
                                            bg-white text-gray-800
                                            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                          placeholder="0"
                                          value={paperMarks[paper.id] || ""}
                                          on:change={(e) => {
                                            const marks = e.target.value
                                              ? parseInt(e.target.value)
                                              : null;
                                            if (
                                              marks !== null &&
                                              (marks < 0 || marks > maxMarks)
                                            ) {
                                              e.target.value =
                                                paperMarks[paper.id] || "";
                                              return;
                                            }
                                            updateMarks(paper, marks);
                                          }}
                                        />
                                        <span class="text-gray-600 font-medium"
                                          >/{maxMarks}</span
                                        >
                                      </div>
                                    </div>
                                  {/if}
                                </div>
                              {/each}
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>

    <!-- Scroll indicator - Now outside main container -->
    <div class="pl-4 pr-6 mt-36 flex">
      <div class="flex flex-col items-center gap-2">
        <span class="text-lg font-medium text-gray-600 mb-2">
          {yearRange.end}
        </span>

        {#each sortedYears as year, i}
          <div class="relative group">
            <button
              class="w-4 h-4 rounded-full transition-all duration-200 {i ===
              currentYearIndex
                ? 'scale-125 ring-2 ring-offset-2 ring-primary ' +
                  getProgressColor(year)
                : getProgressColor(year)}"
              on:click={() => {
                const container = document.getElementById("years-container");
                const yearHeight = container.scrollHeight / sortedYears.length;
                container.scrollTo({
                  top: i * yearHeight,
                  behavior: "smooth",
                });
              }}
            />
            <div
              class="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-primary text-white text-lg rounded-lg
              scale-0 group-hover:scale-100 transition-scale duration-100 whitespace-nowrap"
            >
              <span class="text-2xl font-bold">20{year}</span> - {yearProgress[
                year
              ].percentage}% complete
            </div>
          </div>
        {/each}

        <span class="text-lg font-medium text-gray-600 mt-2">
          {yearRange.start}
        </span>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Hide scrollbar but keep functionality */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Add to existing styles */
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }

  /* Add styles for better dot visibility */
  .grid {
    width: 100%;
    height: 100%;
  }
</style>
