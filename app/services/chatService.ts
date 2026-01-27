// app/services/chatService.ts
export const initializeChatbot = async (courseTitle: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
    const response = await fetch(`${apiUrl}/api/initialize-chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_title: courseTitle }),
    });
    return response.json();
};

export const getAIResponse = async (input: string) => {
    // API call implementation
};
