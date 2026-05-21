package io.javalin.omeglin

import io.javalin.Javalin
import io.javalin.http.staticfiles.Location

fun main() {
    Javalin.create {
        it.staticFiles.add("src/main/resources/public", Location.EXTERNAL)
        it.routes.ws("/api/matchmaking", Matchmaker::websocket)
    }.start("0.0.0.0", 7070)
}
