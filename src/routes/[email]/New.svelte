<script lang="ts">
  import { page } from "$app/stores";

    export let profile
    export let saveProfile
    export let data;
    let {supabase,session} = data
    $: ({supabase,session} = data)
    $: email = $page.params.email;
    let syllabuses: any
    let search: string = ""
    const fetchSyllabuses = async () => {
        syllabuses = await supabase.from("syllabus").select()
        syllabuses = syllabuses.data
    }
    $: fetchSyllabuses()
    $: if (syllabuses && syllabuses[0]) {
        console.log(syllabuses[0])
        console.log(profile.username)
    } 
</script>

{#if syllabuses && syllabuses[0] && profile && profile.syllabus_ids}
    <div class="h-full w-full overflow-y-scroll flex flex-col">
        <input bind:value={search} class="input mb-3" placeholder="Search for a syllabus..."/>
        {#each syllabuses as s }
            {#if s.syllabus_name.toLowerCase().includes(search) || s.syllabus_name.includes(search)}
            <div class="card p-2 mb-1 pb-6 ">
                <header class="card-header flex justify-between">
                    <div class="">
                        <h1 class="text-xl font-bold max-w-40">{s.syllabus_name}</h1>
                        <h2>{s.syllabus_board} - {s.syllabus_level}</h2>
                    </div>
                    <button class="btn btn-primary rounded-md" on:click={() => {
                        profile.syllabus_ids.push(s.syllabus_id)
                        saveProfile(profile)
                        console.log(typeof profile.syllabus_ids)}}>+
                        </button>
                </header>       
            </div>
            {/if}
            
        {/each}
    </div>
{/if}
