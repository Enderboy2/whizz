<script lang="ts">
  import type { SupabaseClient } from "@supabase/supabase-js";

    export let supabase: SupabaseClient
    export let t : any
    let outcomesArray: any[] = [];
    export let addOutcomesToProfile: any;
    export let session: any
    export let outcomes: string

    const buildOutcomes = async (id: any) => {
    try {
      const { data, error } = await supabase
        .from("outcomes")
        .select("*")
        .in("topic_id", id);

      if (error) {
        console.error("Supabase search error:", error.message);
        return [];
      }
      return data;
    } catch (error: any) {
      console.error("building failed:", error.message);
      return [];
    }
  };

  const fetchOutcomesData = async (id: any) => {
    try {
      outcomesArray = await buildOutcomes([id]); // Logs the resolved value of the promise
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  async function toggleOutcome(input: string, toggleNumber: number){
    let numberArray
    if (input != ""){
        numberArray = new Set(input.split(",").map(Number));
    }else {
        numberArray = new Set([])
    }

    if (numberArray.has(toggleNumber)) {
      numberArray.delete(toggleNumber);
    } else {
      numberArray.add(toggleNumber);
    }
    
    let myarr = [];
    for (let element of numberArray) {
        // Set elements pushed into the array
        myarr.push(element);
    }

    myarr.sort()
    let outcomes_string = Array.from(myarr).join(",")
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ outcomes: outcomes_string })
        .eq("id", session.user.id);
      if (error) {
        console.error("Error updating profile:", error.message);
      }
      outcomes = outcomes_string
    } catch (error) {
      console.error("Error adding to profile:", error);
    }
    console.log("toggled -> ",outcomes_string)
    return Array.from(myarr).join(",");
  }

  function searchOutcomes(input: string, searchValue: number): boolean {
    const numberArray = new Set(input.split(",").map(Number));
    return numberArray.has(searchValue);
  }

  $: if (t) {
    fetchOutcomesData(t.topic_id)
  }
  
</script>

<div class="size-full mr-2">
    {#if t}
      <h1 class="text-lg font-bold">{t.topic_name}</h1>
      <hr>
      {#if outcomesArray?.length > 0}  <!-- Use optional chaining for length -->
        {#each outcomesArray as outcome}
          <div class="flex flex-row space-x-3 my-2 ">
                {#if searchOutcomes(outcomes, outcome.id)}
                <button class="border h-6 text-green-500" on:click={() => {toggleOutcome(outcomes, outcome.id)}}>5las</button>
                {:else}
                    <button class="border h-6 " on:click={() => {toggleOutcome(outcomes, outcome.id)}}>lesa</button>
                {/if}
              <p>{outcome?.outcome_name || 'No outcome name available'}</p>
          </div> <!-- Safely access outcome_name -->
        {/each}
      {:else}
        <p>No outcomes available.</p>
      {/if}
    {/if}
  </div>