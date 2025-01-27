<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { getPokemon, getPokemonList, WORD_LIST } from "$lib/pokemonAPI";
  import Main from "./Main.svelte";
  import New from "./New.svelte";

  export let data;
  let { supabase, session } = data;
  $: ({ supabase, session } = data);
  $: email = $page.params.email;

  let pokemonList: any = [];
  let pokemonData: any;
  let isModalOpen = false;
  let isLoading = true; // Tracks loading state
  let pokemonSearchInput = "";
  let shuffledArray = WORD_LIST.sort(() => 0.5 - Math.random());
  let randomWords = shuffledArray.slice(0, 2);

  let profile: any = {
    username: "",
    pokemon_id: "5",
    syllabus_ids: [],
    outcome_ids: [],
  };

  // Fetches and saves the profile to the database
  async function saveProfile(profile: any) {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email);

      if (!profileData?.length) {
        profile.username = randomWords.join(" ");
        const { error } = await supabase.from("profiles").insert({
          ...profile,
          id: session?.user?.id,
          email: session?.user?.email,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profiles")
          .update(profile)
          .eq("id", session?.user?.id);
        if (error) throw error;
      }
      console.log("Profile saved successfully.");
    } catch (error) {
      console.error("Error saving profile:", error.message);
    }
  }

  // Refreshes Pokémon data
  async function refreshPokemonData() {
    try {
      pokemonData = await getPokemon(profile.pokemon_id);
    } catch (error) {
      console.error("Error fetching Pokémon data:", error.message);
    }
  }

  // Initializes the page data
  async function initialize() {
    try {
      isLoading = true;

      pokemonList = await getPokemonList();

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("username, pokemon_id, syllabus_ids, outcome_ids")
        .eq("email", email);

      if (error) throw error;

      if (!profileData?.length && email === session?.user.email) {
        await saveProfile(profile);
      } else if (profileData && profileData.length > 0) {
        profile = profileData[0];
      } else {
        console.warn("No profile found!");
      }

      await refreshPokemonData();
    } catch (error) {
      console.error("Error initializing page:", error.message);
    } finally {
      isLoading = false;
    }
  }

  // Saves profile edits
  async function savePageEdits() {
    try {
      isLoading = true;
      await saveProfile(profile);
      await refreshPokemonData();
      console.log("Edits saved.");
      isModalOpen = false;
    } catch (error) {
      console.error("Error saving page edits:", error.message);
    } finally {
      isLoading = false;
    }
  }

  // Run initialize function when the page loads or changes
  $: initialize();

  page.subscribe(() => initialize());
</script>

{#if isLoading}
  <h1>Loading...</h1>
{:else}
  <div class="h-screen max-w-screen pt-20">
    <div>
      {#if session?.user?.email === email}
        {#if profile.syllabus_ids.length === 0}
          <New {profile} {saveProfile} {data} />
        {:else}
          <Main {profile} {saveProfile} {data} />
        {/if}
      {:else}
        {goto("/login")}
      {/if}
    </div>
  </div>
{/if}
