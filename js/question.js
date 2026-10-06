// Question loading and answer validation.

export async function loadQuestions() {
  const response = await fetch("./data/questions.json");
  if (!response.ok) {
    throw new Error("Unable to load questions.");
  }
  return response.json();
}
