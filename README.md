
## Approaches

- Simple Clustering Approach
    - Cluster neighbouring nodes together instead of setting all linkedIds same. 
    - Take only neighbours with matching phone_no or email
    - Advantages
        - Allows for faster POST /identity function (Less write operations)
        - Simplified CRUD operatons
    - Disadvantages
        - Does not provide correct linkedId in a certain edge case. 
    - Conclusion
        - Since edge-cases for failure may be relatively low, this approach would allow for a faster /identity function to solve for most of the cases. 

- Disjoint Set Union Approach
    - Every connected component can be represented by one linkedId (linkedId of the oldest node in the connected component)
    - Advantages
        - Exact linkedId would be provided. Thus, the user who would be running the application can be determined correctly
    - Disadvantages
        - When merging two large connected components, this will require rewriting all the linkedIds of the newer connected-component. (More write operations)
        - Deletion of Contact nodes can be difficult.
    - Conclusion
        - Not a very scalable solution however it would be very accurate.
    

## Author's Note

In the current project, I have used the Disjoint-Set-Union Approach over the simple-clustering-approach as this is the solution which would provide the solution accurately.
In the real-world implementation of this project, the clustering-approach would be more practical and recommended. 
