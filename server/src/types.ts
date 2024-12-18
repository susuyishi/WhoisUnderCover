export interface User {
    id: string;
    nickname: string;
    role?: "普通人" | "卧底" | "白板";
    word?: string;
}

export interface Room {
    roomId: string;
    users: User[];
    host: string;
}
