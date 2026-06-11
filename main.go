package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"sort"
	"sync"

	"github.com/gin-gonic/gin"
)

//go:generate sh -c "cd frontend && npm install && npm run build"
//go:embed frontend/dist
var frontendFS embed.FS

type Score struct {
	Name  string `json:"name" binding:"required,max=20"`
	Score int    `json:"score" binding:"required,min=0"`
}

type leaderboard struct {
	mu     sync.RWMutex
	scores []Score
}

func (lb *leaderboard) top(n int) []Score {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	sorted := make([]Score, len(lb.scores))
	copy(sorted, lb.scores)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Score > sorted[j].Score
	})

	if len(sorted) > n {
		sorted = sorted[:n]
	}
	return sorted
}

func (lb *leaderboard) add(score Score) []Score {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	lb.scores = append(lb.scores, score)
	sort.Slice(lb.scores, func(i, j int) bool {
		return lb.scores[i].Score > lb.scores[j].Score
	})
	if len(lb.scores) > 10 {
		lb.scores = lb.scores[:10]
	}
	result := make([]Score, len(lb.scores))
	copy(result, lb.scores)
	return result
}

func main() {
	r := gin.Default()
	lb := &leaderboard{}

	api := r.Group("/api")
	{
		api.GET("/scores", func(c *gin.Context) {
			c.JSON(http.StatusOK, lb.top(10))
		})

		api.POST("/scores", func(c *gin.Context) {
			var score Score
			if err := c.ShouldBindJSON(&score); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, lb.add(score))
		})
	}

	if os.Getenv("ENV") == "dev" {
		log.Println("Running in dev mode - frontend should be served by Vite on :3100")
	} else {
		distFS, err := fs.Sub(frontendFS, "frontend/dist")
		if err != nil {
			log.Fatal(err)
		}
		r.NoRoute(func(c *gin.Context) {
			c.FileFromFS(c.Request.URL.Path, http.FS(distFS))
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8092"
	}

	log.Printf("Server starting on port %s\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
