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
  let pokemonSearchInput = "";
  let shuffledArray = WORD_LIST.sort(() => 0.5 - Math.random());
  let randomWords = shuffledArray.slice(0, 2);

  let profile: any = {
    username: "",
    pokemon_id: "5",
    syllabus_ids: [],
    outcome_ids: [],
  };

  async function saveProfile(profile: any) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email);

    if (profileData?.length == 0) {
      profile.username = randomWords.join(" ");
      const { data, error } = await supabase.from("profiles").insert({
        ...profile,
        id: session?.user?.id,
        email: session?.user?.email,
      });
      if (error) {
        console.error("Insert error:", error.message);
      }
    } else {
      const { data, error } = await supabase
        .from("profiles")
        .update(profile)
        .eq("id", session?.user?.id);
      if (error) {
        console.error("Update error:", error.message);
      }
    }
    console.log("saved " + profile + "to " + session?.user?.id);
  }

  async function refreshPokemonData() {
    pokemonData = await getPokemon(profile.pokemon_id);
  }

  page.subscribe(async () => {
    pokemonList = await getPokemonList();

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("username,pokemon_id,syllabus_ids,outcome_ids")
      .eq("email", email);

    if (profileData?.length == 0 && email == session?.user.email) {
      // saveProfile
      await saveProfile(profile);
      console.log("SAVE PROFILE");
    } else if (profileData != null && profileData.length > 0) {
      profile = profileData[0];
    } else {
      console.log("NO PROFILE!");
    }
    await refreshPokemonData();
  });

  async function savePageEdits() {
    await saveProfile(profile);
    await refreshPokemonData;
    console.log("SAVING");
    isModalOpen = false;
  }
</script>

{#if profile.syllabus_ids}
  <div class="h-screen max-w-screen pt-20">
    <div class="">
      {#if session?.user?.email == email}
        {#if profile.syllabus_ids.length == 0}
          <New {profile} {saveProfile} {data} />
        {:else}
          <Main {profile} {saveProfile} {data} />
        {/if}
      {:else}
        {goto("/login")}
      {/if}
    </div>
  </div>
{:else}
  <h1>loading...</h1>
{/if}
