package io.javalin.omeglin

import io.javalin.Javalin
import io.javalin.http.staticfiles.Location
import org.eclipse.jetty.server.Server
import org.eclipse.jetty.server.ServerConnector
import org.eclipse.jetty.util.ssl.SslContextFactory

fun main() {
    val keystorePath = System.getProperty("keystore.path", "keystore.jks")
    val keystorePass = System.getProperty("keystore.pass", "changeit")
    val useHttps     = java.io.File(keystorePath).exists()

    Javalin.create { config ->
        config.staticFiles.add("src/main/resources/public", Location.EXTERNAL)
        config.routes.ws("/api/matchmaking", Matchmaker::websocket)
        if (useHttps) {
            config.jetty.modifyServer { server ->
                val ssl = SslContextFactory.Server()
                ssl.keyStorePath       = keystorePath
                ssl.keyStorePassword   = keystorePass
                ssl.keyManagerPassword = keystorePass
                val https = ServerConnector(server, ssl)
                https.host = "0.0.0.0"
                https.port = 7070
                server.connectors = arrayOf(https)
            }
        }
    }.start("0.0.0.0", if (useHttps) 0 else 7070).also {
        val scheme = if (useHttps) "https" else "http"
        println("FreestyleArena running at $scheme://0.0.0.0:7070")
    }
}
