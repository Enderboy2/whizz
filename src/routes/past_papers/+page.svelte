<script lang="ts">
  import { page } from "$app/stores";
  import { fade, slide } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { onDestroy } from "svelte";
  import Paper from "$lib/Paper.svelte";
  // @ts-ignore
  export let data;
  // Destructure once and rename to avoid conflicts
  let { supabase: supabaseClient, session: userSession } = data;
  // Reactive statement with renamed variables
  $: ({ supabase: supabaseClient, session: userSession } = data);

  let isLoading = false;
  let syllabus_ids: any[] = [];
  let profileData: any;
  let selectedSyllabus: any = null;
  let syllabuses: any[] = [];
  let initialized = false; // Add this flag to track initialization

  // Add new state variables
  let selectedPaper: any = null;
  let slideDirection = "right"; // 'right' for forward, 'left' for back

  // Add state for progress tracking
  let paperProgress = {};
  let paperCounts = {};
  let paperAverages = {};
  let overallProgress = { completed: 0, total: 0, percentage: 0 };

  // Add loading state
  let isLoadingProgress = false;

  // Default year range
  const DEFAULT_YEAR_RANGE = {
    start: 2010,
    end: 2024,
  };

  // Add new state variables at the top
  let showYearRangeModal = false;
  let editingPaper = null;
  let tempYearRange = { start: 2010, end: 2024 };
  let errorMessage = "";

  // Example of how to store selected variants
  let selectedVariants = {}; // This should be fetched from the database

  let showVariantModal = false;
  let currentSyllabusId = null;

  const initialize = async () => {
    if (initialized || !userSession) return; // Skip if already initialized or no session

    try {
      isLoading = true;
      initialized = true; // Set flag to prevent multiple initializations

      const { data: fetchedProfile, error } = await supabaseClient
        .from("profiles")
        .select("id, username, syllabus_ids, outcome_ids, custom_year_ranges")
        .eq("email", userSession?.user.email)
        .single();

      if (error) throw error;

      profileData = fetchedProfile;
      syllabus_ids = fetchedProfile?.syllabus_ids ?? [];

      // Move fetchSyllabuses call here
      if (syllabus_ids.length > 0) {
        const fetchPromises = syllabus_ids.map(async (id: number) => {
          let { data, error } = await supabaseClient
            .from("syllabus")
            .select()
            .eq("syllabus_id", id);
          if (error) {
            console.error(error);
            return null;
          }
          return data;
        });

        const results = await Promise.all(fetchPromises);
        syllabuses = results.flat().filter((item: any) => item !== null);
      }
    } catch (error) {
      console.error("Error initializing page:", error.message);
    } finally {
      isLoading = false;
    }
  };

  // Simplify the reactive statement to only run initialize when session changes
  $: if (userSession) initialize();

  // Add at the top with other reactive statements
  $: if (profileData) {
    // Update custom ranges when profile data loads
    if (profileData.custom_year_ranges) {
      console.log("Loading custom ranges:", profileData.custom_year_ranges);
    }
  }

  // Add at the top of the script section
  $: console.log("Profile Data Source:", {
    hasProfile: !!profileData,
    fields: profileData ? Object.keys(profileData) : [],
    customRanges: profileData?.custom_year_ranges,
  });

  // Fetch progress when syllabus is selected
  async function fetchSyllabusProgress() {
    if (!selectedSyllabus || !profileData) return;

    try {
      isLoadingProgress = true;
      // Reset progress and averages when switching syllabuses
      paperProgress = {};
      paperCounts = {};
      paperAverages = {};
      overallProgress = { completed: 0, total: 0, percentage: 0 };

      // Get paper counts and progress for each paper type
      const paperNumbers = Object.keys(selectedSyllabus.papers || {});

      // Process each paper type separately with its own year range
      await Promise.all(
        paperNumbers.map(async (paperNumber) => {
          // Get custom year range for this paper
          const yearRange = getYearRange(paperNumber);

          // Calculate total papers based on year ranges
          let totalPapers = 0;
          // For years 2016-2024: 7 papers per year
          const recentYearsCount = Math.max(
            0,
            Math.min(yearRange.end, 2024) - Math.max(yearRange.start, 2016) + 1
          );
          totalPapers += recentYearsCount * 7;

          // For years 2010-2015: 6 papers per year
          const olderYearsCount = Math.max(
            0,
            Math.min(yearRange.end, 2015) - Math.max(yearRange.start, 2010) + 1
          );
          totalPapers += olderYearsCount * 6;

          // Store the calculated total
          paperCounts[paperNumber] = totalPapers;

          // Get completed papers count from user_paper_progress
          const { data: progressData, error: progressError } =
            await supabaseClient
              .from("user_paper_progress")
              .select("paper_id, marks")
              .eq("user_id", profileData.id)
              .eq("syllabus_id", selectedSyllabus.syllabus_id)
              .eq("paper", parseInt(paperNumber));

          if (progressError) throw progressError;

          if (progressData) {
            let totalMarks = 0;
            let markedCount = 0;

            // Set progress count to number of completed papers
            paperProgress[paperNumber] = progressData.length;

            progressData.forEach((record) => {
              if (record.marks !== null) {
                totalMarks += record.marks;
                markedCount++;
              }
            });

            if (markedCount > 0) {
              paperAverages[paperNumber] = Math.round(totalMarks / markedCount);
            }
          } else {
            paperProgress[paperNumber] = 0;
          }

          // Log for debugging
          console.log(`Paper ${paperNumber}:`, {
            yearRange,
            recentYears: recentYearsCount,
            olderYears: olderYearsCount,
            totalPapers,
            completedPapers: paperProgress[paperNumber],
            average: paperAverages[paperNumber],
          });
        })
      );

      // Calculate overall progress
      const totals = paperNumbers.reduce(
        (acc, paper) => {
          const count = paperCounts[paper] || 0;
          const completed = paperProgress[paper] || 0;
          acc.total += count;
          acc.completed += completed;
          return acc;
        },
        { completed: 0, total: 0 }
      );

      // Only calculate percentage if there are papers available
      overallProgress = {
        ...totals,
        percentage:
          totals.total > 0
            ? Math.round((totals.completed / totals.total) * 100)
            : 0,
      };

      // Make sure the reactive variables are updated
      paperProgress = { ...paperProgress };
      paperCounts = { ...paperCounts };
      paperAverages = { ...paperAverages };
    } catch (e) {
      console.error("Error fetching progress:", e);
    } finally {
      isLoadingProgress = false;
    }
  }

  // Update progress when syllabus changes
  $: if (selectedSyllabus) {
    fetchSyllabusProgress();
  }

  // Placeholder data structure for paper progress
  interface PaperProgress {
    attempted: number;
    total: number;
    lastAttempted?: string;
    score?: number;
  }

  // Placeholder function - replace with actual backend call later
  const getPaperProgress = (paperId: string): PaperProgress => {
    return {
      attempted: Math.floor(Math.random() * 10),
      total: 10,
      lastAttempted: "2024-03-15",
      score: Math.floor(Math.random() * 100),
    };
  };

  let expandedPaperId: string | null = null;

  const togglePaperDetails = (paperId: string) => {
    expandedPaperId = expandedPaperId === paperId ? null : paperId;
  };

  const showPaper = (paper: any) => {
    slideDirection = "right";
    selectedPaper = paper;
  };

  const goBack = async () => {
    slideDirection = "left";
    selectedPaper = null;
    // Refresh progress when going back
    await fetchSyllabusProgress();
  };

  // Update getYearRange to be more defensive
  function getYearRange(paperNumber) {
    if (!profileData) {
      console.log("No profile data available");
      return (
        selectedSyllabus?.syllabus_past_paper_config?.years ||
        DEFAULT_YEAR_RANGE
      );
    }

    // Initialize custom_year_ranges if it doesn't exist in profileData
    if (!profileData.custom_year_ranges) {
      profileData.custom_year_ranges = {};
    }

    const customRange =
      profileData.custom_year_ranges[selectedSyllabus?.syllabus_id]?.[
        paperNumber
      ];

    if (customRange) {
      console.log(`Using custom range for paper ${paperNumber}:`, customRange);
      return customRange;
    }

    const defaultRange =
      selectedSyllabus?.syllabus_past_paper_config?.years || DEFAULT_YEAR_RANGE;
    console.log(`Using default range for paper ${paperNumber}:`, defaultRange);
    return defaultRange;
  }

  // Update updateCustomYearRange to initialize the field if needed
  async function updateCustomYearRange(paperNumber, newRange) {
    try {
      console.log("Updating range for:", {
        paperNumber,
        newRange,
        currentProfileData: profileData,
      });

      // Initialize custom_year_ranges if it doesn't exist
      if (!profileData.custom_year_ranges) {
        profileData.custom_year_ranges = {};
      }

      // Create new ranges object with proper structure
      const newRanges = {
        ...profileData.custom_year_ranges,
        [selectedSyllabus.syllabus_id]: {
          ...(profileData.custom_year_ranges[selectedSyllabus.syllabus_id] ||
            {}),
          [paperNumber]: newRange,
        },
      };

      console.log("New ranges structure:", newRanges);

      // Update in database
      const { data, error } = await supabaseClient
        .from("profiles")
        .update({
          custom_year_ranges: newRanges,
        })
        .eq("id", profileData.id)
        .select(); // Add select() to get the updated record

      if (error) throw error;

      // Update local state with the returned data
      if (data?.[0]) {
        profileData.custom_year_ranges = data[0].custom_year_ranges;
        console.log("Updated profile data:", profileData);
      }

      // Refresh progress with new year range
      await fetchSyllabusProgress();
    } catch (e) {
      console.error("Error updating year range:", e);
    }
  }

  // Function to update selected variant
  async function updateSelectedVariant(syllabusId, variant) {
    selectedVariants[syllabusId] = variant;

    // Update the database with the new selected variant
    const { error } = await supabaseClient
      .from("profiles")
      .update({ selected_variants: selectedVariants })
      .eq("id", profileData.id);

    if (error) {
      console.error("Error updating selected variant:", error.message);
    }
  }

  // Function to get exam date for a paper
  function getExamDate(paperNumber) {
    const variant = selectedVariants[selectedSyllabus.syllabus_id];
    const examDate = selectedSyllabus.papers[paperNumber].exam_dates?.[variant];
    console.log("Getting exam date:", {
      paperNumber,
      variant,
      examDate,
      hasExamDates: !!selectedSyllabus.papers[paperNumber].exam_dates,
    });
    return examDate;
  }

  // Check if selectedVariants is empty for any syllabus
  $: {
    if (syllabuses.length > 0) {
      syllabuses.forEach((syllabus) => {
        if (!selectedVariants[syllabus.syllabus_id]) {
          console.warn(
            `No variant selected for syllabus: ${syllabus.syllabus_name}`
          );
        }
      });
    }
  }

  // Function to open the variant selection modal
  function openVariantModal(syllabusId) {
    currentSyllabusId = syllabusId;
    showVariantModal = true;
  }

  // Function to select a variant
  function selectVariant(variant) {
    if (currentSyllabusId !== null) {
      updateSelectedVariant(currentSyllabusId, variant);
      showVariantModal = false;
    }
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

  // Create a tilt effect action
  function tiltEffect(node, { s }) {
    if (node) {
      tiltElements.set(s, node);
    }

    const handleMove = (e) => handleMouseMove(e, s);
    const handleEnter = () => handleMouseEnter(s);
    const handleLeave = () => handleMouseLeave(s);

    node.addEventListener("mousemove", handleMove);
    node.addEventListener("mouseenter", handleEnter);
    node.addEventListener("mouseleave", handleLeave);

    return {
      destroy() {
        tiltElements.delete(s);
        node.removeEventListener("mousemove", handleMove);
        node.removeEventListener("mouseenter", handleEnter);
        node.removeEventListener("mouseleave", handleLeave);
      },
    };
  }
</script>

<!-- svelte-ignore missing-declaration -->
<div
  class="flex flex-col bg-white min-h-full h-fit w-full items-center px-4 sm:px-6 lg:px-8"
>
  <h1 class="text-xl sm:text-2xl font-bold mt-0">Choose a Subject:</h1>

  <!-- Make buttons wrap better on mobile -->
  <div class="flex flex-wrap justify-center gap-2 mt-3">
    {#each syllabuses as syllabus}
      <button
        on:click={() => {
          selectedSyllabus = syllabus;
          selectedPaper = null;
          console.log(`Selected syllabus: ${syllabus.syllabus_name}`);
        }}
        class="btn w-fit h-fit bg-primary border-0 border-primary rounded-md p-2 sm:p-4 text-white hover:border-2 hover:bg-white hover:text-primary text-lg sm:text-2xl hover:border-primary"
      >
        {syllabus.syllabus_name}/{syllabus.syllabus_level}
      </button>
    {/each}
  </div>

  {#if selectedSyllabus}
    <!-- Make container responsive and remove fixed height -->
    <div class="relative w-full max-w-4xl min-h-[500px]">
      {#if !selectedPaper}
        <div
          in:slide|local={{
            duration: 150,
            easing: quintOut,
            axis: "x",
            x: slideDirection === "right" ? 300 : -300,
          }}
          out:slide|local={{
            duration: 300,
            easing: quintOut,
            axis: "x",
            x: slideDirection === "right" ? 300 : -300,
          }}
          class="absolute top-0 left-0 right-0 mt-4 sm:mt-8 w-full p-2 sm:p-4 rounded-lg bg-white"
        >
          <div class="mb-4 sm:mb-6">
            <!-- Make header responsive -->
            <div
              class="w-full flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0"
            >
              <h2 class="text-xl sm:text-2xl font-semibold">
                {selectedSyllabus.syllabus_name}
              </h2>
              <div class="flex gap-2 text-sm sm:text-base">
                <p class="text-gray-600">
                  {selectedSyllabus.syllabus_code}
                </p>
                <p>/</p>
                <p class="text-gray-600">
                  {selectedSyllabus.syllabus_level}
                </p>
              </div>
            </div>

            <!-- Adjust progress section padding -->
            <div class="mt-4 p-2 sm:p-4 bg-gray-100 rounded-lg">
              <h3 class="text-base sm:text-lg font-medium mb-2">
                Overall Progress
              </h3>
              <div class="flex items-center gap-4">
                <div
                  class="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden"
                >
                  {#if isLoadingProgress}
                    <div class="h-full bg-gray-400/50 loading-bar"></div>
                  {:else}
                    <div
                      in:fade={{ duration: 200 }}
                      class="h-full rounded-full {overallProgress.percentage ===
                      100
                        ? 'bg-green-500'
                        : 'bg-blue-500'}"
                      style="width: {overallProgress.percentage}%"
                    ></div>
                  {/if}
                </div>
                <span class="text-sm font-medium">
                  {#if isLoadingProgress}
                    Loading...
                  {:else}
                    {overallProgress.percentage}% Complete
                  {/if}
                </span>
              </div>
            </div>
          </div>

          <!-- Adjust paper list spacing -->
          <div class="space-y-2 sm:space-y-4">
            {#each Object.entries(selectedSyllabus?.papers || {}) as [paperNumber, paperConfig]}
              <div
                class="border rounded-lg overflow-hidden"
                use:tiltEffect={{ s: paperNumber }}
              >
                <div
                  class="w-full p-2 sm:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <button
                    class="flex-1"
                    on:click={() => showPaper(paperNumber)}
                  >
                    <div class="flex-1">
                      <div class="flex items-center justify-between">
                        <h3 class="font-bold text-xl sm:text-2xl text-left">
                          Paper {paperNumber}
                        </h3>
                        <div class="relative">
                          <button
                            class="p-1 hover:bg-gray-200 rounded-full"
                            on:click|stopPropagation={() => {
                              editingPaper = paperNumber;
                              tempYearRange = getYearRange(paperNumber);
                              showYearRangeModal = true;
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-6 w-6"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p class="text-sm text-gray-600">
                        Maximum mark: {paperConfig.max_marks}
                        {#if selectedVariants[selectedSyllabus.syllabus_id] && paperConfig.exam_dates}
                          {@const examDate = getExamDate(paperNumber)}
                          • Exam: {new Date(examDate).toLocaleString()}
                        {/if}
                        {#if paperProgress[paperNumber] && paperAverages[paperNumber]}
                          • Your average: {paperAverages[
                            paperNumber
                          ]}/{paperConfig.max_marks}
                        {/if}
                      </p>
                      <div class="flex items-center gap-4 mt-2">
                        <div
                          class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"
                        >
                          {#if isLoadingProgress}
                            <div class="h-full bg-gray-400/50 loading-bar" />
                          {:else}
                            <div
                              in:fade={{ duration: 200 }}
                              class="h-full rounded-full {paperProgress[
                                paperNumber
                              ] === paperCounts[paperNumber]
                                ? 'bg-green-500'
                                : 'bg-blue-500'}"
                              style="width: {((paperProgress[paperNumber] ||
                                0) /
                                (paperCounts[paperNumber] || 1)) *
                                100}%"
                            />
                          {/if}
                        </div>
                        <span class="text-sm text-gray-600">
                          {#if isLoadingProgress}
                            Loading...
                          {:else}
                            {paperProgress[paperNumber] || 0}/{paperCounts[
                              paperNumber
                            ] || 0} Papers
                          {/if}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <!-- Paper view container -->
        <div
          in:slide|local={{
            duration: 300,
            easing: quintOut,
            axis: "x",
            x: 300,
          }}
          out:slide|local={{
            duration: 300,
            easing: quintOut,
            axis: "x",
            x: -300,
          }}
          class="absolute top-0 left-0 right-0 mt-4 sm:mt-8 w-full p-2 sm:p-4 rounded-lg bg-white"
        >
          <div class="mb-0">
            <button
              on:click={goBack}
              class="flex items-center text-primary hover:text-primary-dark transition-colors"
            >
              <svg
                class="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Papers
            </button>
          </div>

          <Paper
            paper={selectedPaper}
            {supabaseClient}
            {profileData}
            syllabusId={selectedSyllabus.syllabus_id}
            syllabus={selectedSyllabus}
            yearRange={getYearRange(selectedPaper)}
            on:progressUpdate={async () => {
              // Refetch progress when paper marks are updated
              await fetchSyllabusProgress();
            }}
          />
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Year Range Modal -->
{#if showYearRangeModal}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 class="text-xl font-bold mb-4">
        Custom Year Range for Paper {editingPaper}
      </h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700"
            >Start Year</label
          >
          <input
            type="range"
            min="2010"
            max="2024"
            bind:value={tempYearRange.start}
            class="mt-1 w-full"
            on:input={() => {
              if (tempYearRange.start > tempYearRange.end) {
                errorMessage = "Start year cannot be greater than end year.";
              } else {
                errorMessage = "";
              }
            }}
          />
          <span class="text-center">{tempYearRange.start}</span>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">End Year</label
          >
          <input
            type="range"
            min="2010"
            max="2024"
            bind:value={tempYearRange.end}
            class="mt-1 w-full"
            on:input={() => {
              if (tempYearRange.start > tempYearRange.end) {
                errorMessage = "Start year cannot be greater than end year.";
              } else {
                errorMessage = "";
              }
            }}
          />
          <span class="text-center">{tempYearRange.end}</span>
        </div>
      </div>
      {#if errorMessage}
        <p class="text-red-500 text-sm">{errorMessage}</p>
      {/if}
      <div class="mt-6 flex justify-end space-x-3">
        <button
          class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
          on:click={() => {
            showYearRangeModal = false;
            editingPaper = null;
          }}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md"
          on:click={async () => {
            if (tempYearRange.start <= tempYearRange.end) {
              await updateCustomYearRange(editingPaper, tempYearRange);
              showYearRangeModal = false;
              editingPaper = null;
            } else {
              errorMessage = "Start year cannot be greater than end year.";
            }
          }}
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal for selecting a variant -->
{#if showVariantModal}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 class="text-xl font-bold mb-4">Select Variant</h3>
      <div class="space-y-4">
        <button on:click={() => selectVariant("variant1")}>Variant 1</button>
        <button on:click={() => selectVariant("variant2")}>Variant 2</button>
        <button on:click={() => selectVariant("variant3")}>Variant 3</button>
      </div>
      <div class="mt-6 flex justify-end space-x-3">
        <button
          class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
          on:click={() => {
            showVariantModal = false;
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes loadingProgress {
    0% {
      width: 0%;
    }
    50% {
      width: 100%;
    }
    100% {
      width: 0%;
    }
  }

  .loading-bar {
    animation: loadingProgress 1.5s ease-in-out infinite;
  }
</style>
