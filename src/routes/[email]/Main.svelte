<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onDestroy } from "svelte";
  import Syllabus from "./Syllabus.svelte";
  import Search from "./Search.svelte";

  export let data;
  let { supabase, session } = data;
  $: ({ supabase, session } = data);
  $: email = $page.params.email;
  export let profile;
  export let saveProfile;
  let syllabuses: any[] = [];
  let activeSyllabus: any = null;
  let isSearch = false;
  let menuOpenIndex: number | null = null;

  const fetchSyllabuses = async () => {
    if (profile.syllabus_ids && profile.syllabus_ids.length > 0) {
      const fetchPromises = profile.syllabus_ids.map(async (id: number) => {
        console.log(id);
        let { data, error } = await supabase
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
      console.log(syllabuses);
    }
  };

  const toggleSearch = () => {
    isSearch = !isSearch;
  };

  const toggleMenu = (index: number) => {
    menuOpenIndex = menuOpenIndex === index ? null : index;
  };

  const deleteSyllabus = (syllabusId: number) => {
    profile.syllabus_ids = profile.syllabus_ids.filter(
      (id) => id !== syllabusId
    );
    saveProfile(profile);
    menuOpenIndex = null;
  };

  $: if (profile?.syllabus_ids) {
    fetchSyllabuses();
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

{#if syllabuses.length > 0}
  {#if activeSyllabus}
    <Syllabus {activeSyllabus} {data} />
    <button
      class="btn fixed top-20 left-2 bg-white border-2 text-center
      "
      on:click={() => (activeSyllabus = undefined)}>⬅</button
    >
  {:else if isSearch}
    <div class="w-auto h-auto flex flex-col justify-center items-center mt-24">
      <Search {profile} {saveProfile} {data} />
    </div>
    <button
      class="btn fixed top-20 left-2 bg-white border-2 text-center"
      on:click={() => toggleSearch()}>⬅</button
    >
  {:else}
    <div
      class="h-full max-w-screen min-w-fit items-center justify-center flex flex-col text-center min-h-fit mx-4"
    >
      <h1 class="mb-6 font-bold text-xl">What do you want to study?</h1>
      <div class=" flex flex-col gap-4">
        {#each syllabuses as s, index}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="card p-2 mb-1 pb-6 rounded-md !bg-white !text-black border-2 border-gray-300 relative cursor-pointer hover:shadow-lg transition-shadow duration-300"
            on:click={() => (activeSyllabus = s)}
            use:tiltEffect={{ s }}
          >
            <header class="card-header flex justify-between items-center">
              <div class="flex justify-between items-center gap-6">
                <h1 class="text-3xl font-bold max-w-40">{s.syllabus_name}</h1>
                <div class="flex gap-2 items-center mt-2">
                  <span class="badge bg-black text-white rounded-md"
                    >{s.syllabus_code}</span
                  >
                  <span class="badge bg-black text-white rounded-md"
                    >{s.syllabus_level}</span
                  >
                  <span class="badge bg-black text-white rounded-md"
                    >{s.syllabus_board}</span
                  >
                  <button
                    class="btn btn-dots"
                    on:click={(event) => {
                      event.stopPropagation();
                      toggleMenu(index);
                    }}>⋮</button
                  >
                  {#if menuOpenIndex === index}
                    <div class="menu translate-x-16">
                      <button
                        class="btn btn-danger"
                        on:click={() => deleteSyllabus(s.syllabus_id)}
                      >
                        Delete
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
              <div></div>
            </header>
          </div>
        {/each}
      </div>
      <button
        class="btn bg-black text-white mt-4"
        on:click={() => toggleSearch()}>add another syllabus</button
      >
    </div>
  {/if}
{/if}

<style>
  .btn-dots {
    background-color: transparent; /* Make the button background transparent */
    border: none; /* Remove default button border */
    color: #333; /* Set the color of the dots */
    font-size: 24px; /* Increase the font size for better visibility */
    cursor: pointer; /* Change cursor to pointer */
    transition: color 0.3s; /* Smooth transition for hover effect */
  }

  .btn-dots:hover {
    color: #007bff; /* Change color on hover */
  }

  .menu {
    position: absolute; /* Position it relative to the parent */
    background-color: white; /* Set background color */
    border: 1px solid #ccc; /* Border for the menu */
    border-radius: 4px; /* Rounded corners */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); /* Shadow for depth */
    z-index: 1000; /* Ensure it appears above other elements */
    right: 0; /* Align the menu to the right */
    margin-top: 5px; /* Space between the button and the menu */
  }

  .btn-danger {
    background-color: #dc3545; /* Red background for delete button */
    color: white; /* White text color */
    border: none; /* Remove border */
    padding: 8px 12px; /* Padding for the button */
    border-radius: 4px; /* Rounded corners */
    cursor: pointer; /* Change cursor to pointer */
    transition: background-color 0.3s; /* Smooth transition for hover effect */
  }

  .btn-danger:hover {
    background-color: #c82333; /* Darker red on hover */
  }
</style>
